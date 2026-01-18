FROM node:20-alpine

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

# Install dependencies (including dev deps for building)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build packages first
RUN npm run build:packages

# Build API
RUN npm run build -w @reviewscope/api

# Remove dev dependencies to save space (optional, but good practice)
# RUN npm prune --production --workspaces # Can be risky in monorepos if hoisting is weird, skipping for safety

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/api/dist/apps/api/src/index.js"]
