# --- Base Stage ---
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# --- Builder Stage ---
FROM base AS builder
# Copy workspace configuration
COPY package.json package-lock.json ./

# Copy all package.json files for better caching
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/context-engine/package.json ./packages/context-engine/
COPY packages/llm-core/package.json ./packages/llm-core/
COPY packages/rules-engine/package.json ./packages/rules-engine/
COPY packages/security/package.json ./packages/security/

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build shared packages
RUN npm run build:packages

# --- API Stage ---
FROM builder AS api-builder
RUN npm run build -w @reviewscope/api

FROM base AS api
ENV NODE_ENV=production
COPY --from=api-builder /app/package.json /app/package-lock.json ./
COPY --from=api-builder /app/node_modules ./node_modules
COPY --from=api-builder /app/apps/api ./apps/api
COPY --from=api-builder /app/packages ./packages

EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate -w @reviewscope/api && node apps/api/dist/apps/api/src/index.js"]

# --- Worker Stage ---
FROM builder AS worker-builder
RUN npm run build -w @reviewscope/worker

FROM base AS worker
ENV NODE_ENV=production
COPY --from=worker-builder /app/package.json /app/package-lock.json ./
COPY --from=worker-builder /app/node_modules ./node_modules
COPY --from=worker-builder /app/apps/worker ./apps/worker
COPY --from=worker-builder /app/packages ./packages

CMD ["node", "apps/worker/dist/apps/worker/src/index.js"]

# --- Dashboard Stage ---
FROM builder AS dashboard-builder
RUN npm run build -w @reviewscope/dashboard

FROM base AS dashboard
ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone build
COPY --from=dashboard-builder /app/apps/dashboard/.next/standalone ./
COPY --from=dashboard-builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=dashboard-builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static

EXPOSE 3000
CMD ["node", "apps/dashboard/server.js"]
