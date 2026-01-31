# syntax=docker/dockerfile:1.4
# 1. Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat dumb-init
WORKDIR /app
# Ensure .env files exist so scripts using --env-file flag don't crash
RUN mkdir -p apps/api apps/worker apps/dashboard && \
    touch apps/api/.env apps/worker/.env apps/dashboard/.env

# 2. Dependencies manifest (copy only package.json/lock files)
FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/context-engine/package.json ./packages/context-engine/
COPY packages/llm-core/package.json ./packages/llm-core/
COPY packages/rules-engine/package.json ./packages/rules-engine/
COPY packages/security/package.json ./packages/security/

# 3. Development Dependencies & Build
FROM manifests AS builder
# Install ALL deps (dev included) to build
RUN npm ci
# Copy source code
COPY . .
# Build shared packages first
RUN npm run build:packages
# Build apps
RUN npm run build -w @reviewscope/api
RUN npm run build -w @reviewscope/worker
RUN npm run build -w @reviewscope/dashboard

# 4. Production Dependencies (Pruned)
FROM manifests AS prod-deps
# Install ONLY production dependencies
RUN npm ci --omit=dev --ignore-scripts

# 5. API Runtime
FROM base AS api
ENV NODE_ENV=production
# Copy prod dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy built packages (targets of symlinks)
COPY --from=builder /app/packages ./packages
# Copy built app
COPY --from=builder /app/apps/api ./apps/api
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/api/dist/apps/api/src/index.js"]

# 6. Worker Runtime
FROM base AS worker
ENV NODE_ENV=production
# Copy prod dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy built packages (targets of symlinks)
COPY --from=builder /app/packages ./packages
# Copy built app
COPY --from=builder /app/apps/worker ./apps/worker
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/worker/dist/apps/worker/src/index.js"]

# 7. Dashboard Runtime
FROM base AS dashboard
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Dashboard standalone handles its own deps
COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/dashboard/server.js"]
