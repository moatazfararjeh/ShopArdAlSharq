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
ARG EXPO_PUBLIC_APP_URL

ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_APP_NAME=$EXPO_PUBLIC_APP_NAME
ENV EXPO_PUBLIC_DEFAULT_LOCALE=$EXPO_PUBLIC_DEFAULT_LOCALE
ENV EXPO_PUBLIC_CURRENCY=$EXPO_PUBLIC_CURRENCY
ENV EXPO_PUBLIC_CURRENCY_SYMBOL=$EXPO_PUBLIC_CURRENCY_SYMBOL
ENV EXPO_PUBLIC_ENABLE_PAYMENTS=$EXPO_PUBLIC_ENABLE_PAYMENTS
ENV EXPO_PUBLIC_ENABLE_SOCIAL_LOGIN=$EXPO_PUBLIC_ENABLE_SOCIAL_LOGIN
ENV EXPO_PUBLIC_ENABLE_REVIEWS=$EXPO_PUBLIC_ENABLE_REVIEWS
ENV EXPO_PUBLIC_APP_URL=$EXPO_PUBLIC_APP_URL

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDeps needed for expo build)
# --mount=type=cache persists the npm cache between Coolify deploys
# NODE_OPTIONS limits npm's own heap to avoid OOM during install
RUN --mount=type=cache,target=/root/.npm \
    NODE_OPTIONS="--max-old-space-size=1536" \
    npm ci --legacy-peer-deps --ignore-scripts --prefer-offline --maxsockets=5

# ── Copy ONLY what expo export needs ─────────────────────────────────────────
# Using explicit paths instead of "COPY . ." so that any new files or
# directories added to the repo (docs, scripts, migrations, design files, etc.)
# are NEVER accidentally included, keeping the build context lean permanently.
# Config / entry files
COPY app.json babel.config.js metro.config.cjs tailwind.config.js tsconfig.json ./
COPY global.css nativewind-env.d.ts index.ts App.tsx ./
# Source directories
COPY app/        ./app/
COPY assets/     ./assets/
COPY components/ ./components/
COPY hooks/      ./hooks/
COPY i18n/       ./i18n/
COPY lib/        ./lib/
COPY schemas/    ./schemas/
COPY services/   ./services/
COPY stores/     ./stores/
COPY types/      ./types/
COPY utils/      ./utils/
# ─────────────────────────────────────────────────────────────────────────────

# Free npm/package-manager memory before the export step
RUN npm cache clean --force 2>/dev/null; rm -rf /tmp/* 2>/dev/null; true

# Build the static web export
# NODE_OPTIONS: cap heap to avoid OOM kills on limited-RAM servers
# METRO_CACHE_DIR: tells Metro to write its bundle cache to the mounted volume,
#   so subsequent deploys on the same Coolify host skip re-bundling unchanged modules.
RUN --mount=type=cache,target=/root/.metro-cache \
    CI=1 \
    NODE_OPTIONS="--max-old-space-size=1536" \
    EXPO_NO_TELEMETRY=1 \
    EXPO_NO_SOURCEMAPS=1 \
    GENERATE_SOURCEMAP=false \
    EXPO_USE_FAST_RESOLVER=1 \
    METRO_CACHE_DIR=/root/.metro-cache \
    npx expo export --platform web --output-dir dist --max-workers 1

# ---- Serve Stage ----
FROM nginx:alpine

# Copy built output to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing + security headers
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
\n\
  # Security headers\n\
  add_header X-Frame-Options "SAMEORIGIN" always;\n\
  add_header X-Content-Type-Options "nosniff" always;\n\
  add_header X-XSS-Protection "1; mode=block" always;\n\
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;\n\
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n\
\n\
  # Prevent caching of index.html (SPA shell)\n\
  location = /index.html {\n\
    add_header Cache-Control "no-cache, no-store, must-revalidate" always;\n\
    add_header X-Frame-Options "SAMEORIGIN" always;\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
  }\n\
\n\
  # Cache static assets aggressively\n\
  location /assets/ {\n\
    add_header Cache-Control "public, max-age=31536000, immutable";\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
  }\n\
\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
