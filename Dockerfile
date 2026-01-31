# syntax=docker/dockerfile:1.4
# 1. Base image with Bun for fast installs
FROM oven/bun:1-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init nodejs npm
RUN mkdir -p apps/api apps/worker apps/dashboard && \
    touch apps/api/.env apps/worker/.env apps/dashboard/.env

# 2. Dependencies manifest
FROM base AS manifests
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/context-engine/package.json ./packages/context-engine/
COPY packages/llm-core/package.json ./packages/llm-core/
COPY packages/rules-engine/package.json ./packages/rules-engine/
COPY packages/security/package.json ./packages/security/

# 3. Development Dependencies & Build
FROM manifests AS builder
# Install ALL deps with Bun (fast)
RUN bun install --frozen-lockfile
# Copy source code
COPY . .
# Build packages with Bun
RUN bun run bun:build:packages
# Build apps - use npm for dashboard (Next.js compatibility)
RUN bun run --filter @reviewscope/api build
RUN bun run --filter @reviewscope/worker build
RUN npm run build -w @reviewscope/dashboard

# 4. Production Dependencies (Pruned)
FROM manifests AS prod-deps
RUN bun install --frozen-lockfile --production

# 5. API Runtime
FROM base AS api
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/api/dist/apps/api/src/index.js"]

# 6. Worker Runtime
FROM base AS worker
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker ./apps/worker
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/worker/dist/apps/worker/src/index.js"]

# 7. Dashboard Runtime
FROM base AS dashboard
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/apps/dashboard/.next/standalone ./
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/dashboard/server.js"]
