# ─────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed by Prisma
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production=false

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Compile TypeScript
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Production runner
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install dependencies needed by Prisma
RUN apk add --no-cache openssl

# Install production deps only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy Prisma schema and generate client for the runner environment
COPY prisma ./prisma
RUN npx prisma generate

# Expose port
EXPOSE 5000

# Run server
CMD ["node", "dist/server.js"]
