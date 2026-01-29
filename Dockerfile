# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.11.0
ARG ALPINE_VERSION=3.19

# -----------------------------------------------------------------------------
# Base Stage
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat dumb-init
# Create directory structure to ensure permissions can be set correctly later
RUN mkdir -p apps/api apps/worker apps/dashboard packages/context-engine packages/llm-core packages/rules-engine packages/security

# -----------------------------------------------------------------------------
# Dependencies Stage (for caching)
# -----------------------------------------------------------------------------
FROM base AS deps
# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/context-engine/package.json ./packages/context-engine/
COPY packages/llm-core/package.json ./packages/llm-core/
COPY packages/rules-engine/package.json ./packages/rules-engine/
COPY packages/security/package.json ./packages/security/

# Install dependencies (including devDependencies for building)
RUN npm ci

# -----------------------------------------------------------------------------
# Builder Stage
# -----------------------------------------------------------------------------
FROM base AS builder
# Copy node_modules from deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app .

# Copy source code
COPY . .

# Build shared packages
RUN npm run build:packages

# -----------------------------------------------------------------------------
# Service Builders (Parallelizable)
# -----------------------------------------------------------------------------
FROM builder AS api-builder
RUN npm run build -w @reviewscope/api

FROM builder AS worker-builder
RUN npm run build -w @reviewscope/worker

FROM builder AS dashboard-builder
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @reviewscope/dashboard

# -----------------------------------------------------------------------------
# Production Runner Base
# -----------------------------------------------------------------------------
FROM base AS runner-base
ENV NODE_ENV=production
# Copy package.json files from deps (structure only)
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# -----------------------------------------------------------------------------
# API Runner
# -----------------------------------------------------------------------------
FROM runner-base AS api
# Use non-root user for security
USER node

# Copy built packages (dist) from builder
COPY --from=builder --chown=node:node /app/packages ./packages

# Copy built application
COPY --from=api-builder --chown=node:node /app/apps/api ./apps/api

EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/api/dist/apps/api/src/index.js"]

# -----------------------------------------------------------------------------
# Worker Runner
# -----------------------------------------------------------------------------
FROM runner-base AS worker
USER node

# Copy built packages (dist) from builder
COPY --from=builder --chown=node:node /app/packages ./packages

# Copy built application
COPY --from=worker-builder --chown=node:node /app/apps/worker ./apps/worker

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/worker/dist/apps/worker/src/index.js"]

# -----------------------------------------------------------------------------
# Dashboard Runner
# -----------------------------------------------------------------------------
FROM base AS dashboard
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# Set up user for Next.js
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build assets
COPY --from=dashboard-builder --chown=nextjs:nodejs /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=dashboard-builder --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=dashboard-builder --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./apps/dashboard/.next/static

USER nextjs

EXPOSE 3000
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/dashboard/server.js"]
