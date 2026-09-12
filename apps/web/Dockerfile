# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./

# Copy all package manifests
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

# Build args for Vite environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build shared package first
RUN cd packages/shared && npx tsc -p tsconfig.json || true
# Add .js extensions to relative imports in compiled dist (required for Node.js ESM)
RUN find packages/shared/dist -name "*.js" -exec sed -i "s|from '\.\./\([^']*\)'|from '../\1.js'|g" {} + ; \
    find packages/shared/dist -name "*.js" -exec sed -i "s|from '\./\([^'.][^']*\)'|from './\1.js'|g" {} +

# Build the frontend
RUN cd apps/web && npx vite build

# ─── Stage 2: Serve with nginx ───────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy custom nginx config (handles SPA routing)
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
