# syntax=docker/dockerfile:1
# Clinema web — build the SPA with Node, serve it with unprivileged Nginx

# ---- Build stage ---------------------------------------------------------
FROM node:22.23.5-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- Runtime stage -------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.28.2-alpine AS runtime
LABEL org.opencontainers.image.title="clinema-web" \
      org.opencontainers.image.source="https://github.com/Matsadura/Clinema"

# Rendered by the image's entrypoint (envsubst) into /etc/nginx/conf.d/
ENV API_UPSTREAM=http://api:5000 \
    NGINX_RESOLVER=127.0.0.11
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Runs as the image's non-root "nginx" user (uid 101) on port 8080
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
