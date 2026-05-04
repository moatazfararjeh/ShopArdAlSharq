# syntax=docker/dockerfile:1
# ---- Build Stage ----
FROM node:22-slim AS builder

WORKDIR /app

# Build-time environment variables (passed via --build-arg or Coolify env vars)
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG EXPO_PUBLIC_APP_NAME
ARG EXPO_PUBLIC_DEFAULT_LOCALE
ARG EXPO_PUBLIC_CURRENCY
ARG EXPO_PUBLIC_CURRENCY_SYMBOL
ARG EXPO_PUBLIC_ENABLE_PAYMENTS
ARG EXPO_PUBLIC_ENABLE_SOCIAL_LOGIN
ARG EXPO_PUBLIC_ENABLE_REVIEWS

ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_APP_NAME=$EXPO_PUBLIC_APP_NAME
ENV EXPO_PUBLIC_DEFAULT_LOCALE=$EXPO_PUBLIC_DEFAULT_LOCALE
ENV EXPO_PUBLIC_CURRENCY=$EXPO_PUBLIC_CURRENCY
ENV EXPO_PUBLIC_CURRENCY_SYMBOL=$EXPO_PUBLIC_CURRENCY_SYMBOL
ENV EXPO_PUBLIC_ENABLE_PAYMENTS=$EXPO_PUBLIC_ENABLE_PAYMENTS
ENV EXPO_PUBLIC_ENABLE_SOCIAL_LOGIN=$EXPO_PUBLIC_ENABLE_SOCIAL_LOGIN
ENV EXPO_PUBLIC_ENABLE_REVIEWS=$EXPO_PUBLIC_ENABLE_REVIEWS

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDeps needed for expo build)
# --mount=type=cache persists the npm cache between Coolify deploys, avoiding re-downloading packages
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --ignore-scripts

# Copy source code
COPY . .

# Build the static web export
RUN npx expo export --platform web

# ---- Serve Stage ----
FROM nginx:alpine

# Copy built output to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: redirect all 404s to index.html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
