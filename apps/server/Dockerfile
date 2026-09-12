# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./

# Copy all package manifests (needed for npm workspaces)
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install ALL dependencies (including devDeps for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY packages/shared/ ./packages/shared/
COPY apps/server/ ./apps/server/

# Generate Prisma client
RUN npm run prisma:generate

# Build shared package first, then server
RUN cd packages/shared && npx tsc -p tsconfig.json || true
RUN cd apps/server && npx tsc -p tsconfig.json

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init and openssl for proper signal handling and Prisma
RUN apk add --no-cache dumb-init openssl

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy Prisma schema and generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY apps/server/prisma ./apps/server/prisma

# Create directories for uploads and backups (volumes will be mounted here)
RUN mkdir -p /app/apps/server/uploads /app/apps/server/backups

# Use non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

WORKDIR /app/apps/server

EXPOSE 4000

# Run migrations then start server
COPY --chown=nodejs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]
