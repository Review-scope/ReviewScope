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

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build packages
RUN npm run build:packages

# Build Worker
RUN npm run build -w @reviewscope/worker

ENV NODE_ENV=production

CMD ["node", "apps/worker/dist/apps/worker/src/index.js"]
