# ==========================================
# STAGE 1: Build Frontend & Backend Server
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy full application source
COPY . .

# Compile Vite client assets and bundle server.ts -> dist/server.cjs
RUN npm run build

# Prune dev dependencies for production image
RUN npm prune --production

# ==========================================
# STAGE 2: Production Lightweight Image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy production node_modules and built dist bundle
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

# Security: run as non-root user
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
