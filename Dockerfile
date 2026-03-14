# ---- Build Stage ----
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDeps needed for expo build)
RUN npm ci --legacy-peer-deps --ignore-scripts

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
