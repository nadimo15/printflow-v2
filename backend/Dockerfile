# ─────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

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

# Install production deps only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy Prisma schema + generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Expose port
EXPOSE 5000

# Run migrations then start
CMD ["node", "dist/server.js"]
