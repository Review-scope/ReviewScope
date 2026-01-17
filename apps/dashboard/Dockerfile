FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy all workspace package files
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/context-engine/package.json ./packages/context-engine/
COPY packages/llm-core/package.json ./packages/llm-core/
COPY packages/rules-engine/package.json ./packages/rules-engine/
COPY packages/security/package.json ./packages/security/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build packages
RUN npm run build:packages

# Build Dashboard
RUN npm run build -w @reviewscope/dashboard

# --- Runner Stage ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone build
# The standalone build puts the app in .next/standalone/apps/dashboard/server.js
# We need to copy the standalone folder to /app
COPY --from=builder /app/apps/dashboard/.next/standalone ./

# Copy static assets (Next.js requires these to be manually copied for standalone)
COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder /app/apps/dashboard/.next/static ./apps/dashboard/.next/static

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["node", "apps/dashboard/server.js"]
