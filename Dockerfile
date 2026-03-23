# ── Stage 1: Build ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Copy root package.json (contains the combined build script)
COPY package.json ./

# Copy both frontend directories
COPY frontend-store/ ./frontend-store/
COPY frontend-erp/ ./frontend-erp/

# Run the combined build:
#   1. Install + build frontend-store
#   2. Install + build frontend-erp
#   3. Copy frontend-erp/dist into frontend-store/dist/admin
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────────────────
FROM nginx:alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config with SPA fallback routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the combined build output
COPY --from=build /app/frontend-store/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
