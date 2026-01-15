# ReviewScope – AI-Powered Code Review Automation

ReviewScope is an intelligent PR review platform that combines **static analysis**, **semantic context**, and **AI reasoning** to provide comprehensive, fast code reviews on GitHub.

## Overview

ReviewScope analyzes pull requests end-to-end, evaluating code quality, security, performance, and maintainability. It runs directly on your own API keys, so you control costs and data.

**Key Capabilities:**
- 🔍 **Static Analysis** – AST-based rule detection (no LLM required, always free)
- 🧠 **AI-Powered Reviews** – Complexity-aware routing between fast (Gemini) and accurate (GPT-4) models
- 📚 **Semantic RAG** – Retrieves relevant code context from your repository's history
- ⚡ **Smart Batching** – Handles large PRs by intelligently chunking files
- 🎯 **Rule Validation** – LLM classifies static findings (valid/false-positive/contextual)
- 💰 **BYO API Keys** – Transparent pricing, you pay only for what you use

## Technology Stack

**Frontend & Dashboard:**
- Next.js 16 (Turbopack)
- TailwindCSS + shadcn/ui
- NextAuth (GitHub OAuth)

**Backend & Processing:**
- Node.js Worker (background review jobs)
- Drizzle ORM + PostgreSQL
- Upstash Redis (caching & rate limiting)

**AI & LLM:**
- Gemini 2.5 (fast, low-cost reviews)
- GPT-4 (complex PRs, high accuracy)
- Context Engine (RAG + chunking)

**Integration:**
- GitHub Webhooks (real-time PR events)
- GitHub Marketplace (billing integration)
- GitHub API (PR data, code retrieval)

## Project Structure

```
ReviewScope/
├── apps/
│   ├── api/                    # REST API & webhooks
│   ├── dashboard/              # Next.js web app (pricing, settings, auth)
│   └── worker/                 # Node.js background job processor
├── packages/
│   ├── context-engine/         # RAG, chunking, layer assembly
│   ├── llm-core/               # LLM routing, prompting, response parsing
│   ├── rules-engine/           # Static analysis (JavaScript/TypeScript)
│   └── security/               # Encryption, masking utilities
└── tsconfig.base.json          # Shared TypeScript config
```

## Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Upstash Redis URL (free tier available)
- GitHub App (for webhooks)
- LLM API keys (Gemini & OpenAI)

### 1. Clone & Install

```bash
git clone <repo>
cd ReviewScope
npm install
```

### 2. Environment Configuration

Create `.env.local` files in each app:

**`apps/api/.env.local`**
```
DATABASE_URL=postgresql://user:pass@localhost/reviewscope
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY..."
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

**`apps/worker/.env.local`**
```
DATABASE_URL=postgresql://user:pass@localhost/reviewscope
REDIS_URL=https://default:password@redis-url.upstash.io
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

**`apps/dashboard/.env.local`**
```
DATABASE_URL=postgresql://user:pass@localhost/reviewscope
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
GITHUB_ID=your_github_app_client_id
GITHUB_SECRET=your_github_app_secret
```

### 3. Database Setup

```bash
cd apps/api
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 4. Run Development Servers

**Terminal 1 – API:**
```bash
cd apps/api
npm run dev
```

**Terminal 2 – Worker:**
```bash
cd apps/worker
npm run dev
```

**Terminal 3 – Dashboard:**
```bash
cd apps/dashboard
npm run dev
```

Dashboard available at `http://localhost:3000`

## Pricing & Plans

| Feature | Free | Pro | Team |
|---------|------|-----|------|
| Price | $0 | $15/mo | $50/mo |
| Repositories | Up to 3 | Up to 5 | Unlimited |
| Files per PR | 30 | 100 | Unlimited (Smart Batching) |
| RAG Context | 2 snippets | 5 snippets | 8 snippets |
| Custom Prompts | ❌ | ✅ | ✅ |
| Org Controls | ❌ | ❌ | ✅ |
| Support | Community | Email | 24/7 Priority |

**All tiers include:**
- Static analysis (always free)
- AI reviews via your own API keys
- GitHub Marketplace seamless upgrades

## Architecture

### Workflow

```
GitHub PR Event
    ↓
API Webhook Handler
    ↓
Extract PR diff + fetch repo context
    ↓
Queue Review Job (Redis/Bull)
    ↓
Worker: Complexity Scorer
    ↓
Run Static Rules (AST analysis)
    ↓
RAG Retriever (semantic search)
    ↓
Context Engine (assemble layers)
    ↓
LLM Router (Gemini vs GPT-4)
    ↓
Generate Review + Rule Validation
    ↓
Post Comment to GitHub PR
```

### Key Components

**Rules Engine** (`packages/rules-engine/`)
- JavaScript/TypeScript AST parser
- Detects anti-patterns, security issues, code quality problems
- Zero LLM cost, always runs

**Context Engine** (`packages/context-engine/`)
- Semantic RAG using Upstash Redis
- Retrieves relevant code snippets from PR history
- Assembles system prompt with all context layers

**LLM Core** (`packages/llm-core/`)
- Routes by PR complexity (Gemini for simple, GPT-4 for complex)
- Injects rule violations into prompt
- Parses response including rule validation classifications

**Worker** (`apps/worker/`)
- Bull queue for async job processing
- Executes complexity scorer, rules, RAG, LLM calls
- Rate limiting per plan (Free=3/day, Pro=15/day, Team=unlimited)

## Configuration & Customization

### Custom Review Prompts (Pro/Team)

Edit system prompt per repository:
```
Dashboard → Repositories → [Select] → Settings → Custom Prompt
```

### Plan Limits

Edit `apps/worker/src/lib/plans.ts`:
```typescript
FREE: { dailyLimit: 3, reposLimit: 3, filesLimit: 30, ragSnippets: 2 },
PRO:  { dailyLimit: 15, reposLimit: 5, filesLimit: 100, ragSnippets: 5 },
TEAM: { dailyLimit: Infinity, reposLimit: Infinity, filesLimit: Infinity, ragSnippets: 8 },
```

### LLM Model Selection

Edit `packages/llm-core/src/selectModel.ts`:
```typescript
// Complexity thresholds for model routing
if (complexity === "trivial" || complexity === "simple") {
  return "gemini-2.5-flash"; // Fast, cheap
} else {
  return "gpt-4o"; // Accurate, thorough
}
```

## Deployment

### Vercel (Dashboard)
```bash
cd apps/dashboard
vercel deploy
```

### Railway/Render (API + Worker)
```bash
cd apps/api
# Deploy with DATABASE_URL env var

cd apps/worker
# Deploy with REDIS_URL, LLM API keys
```

### GitHub Actions (CI Integration)

Create `.github/workflows/review.yml`:
```yaml
name: ReviewScope
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v3
      - run: curl -X POST ${{ secrets.REVIEW_WEBHOOK }} \
          -H "X-GitHub-Event: pull_request" \
          -H "X-Hub-Signature-256: sha256=..." \
          -d "${{ toJson(github.event) }}"
```

## Monitoring & Logging

### Database Queries
```bash
cd apps/api
npm run studio  # Drizzle Studio
```

### Redis Cache
```bash
# Check Upstash console or use redis-cli
redis-cli GET review:pr:123
```

### Worker Queue
```bash
# Monitor Bull dashboard
npm run queue:ui  # localhost:3000/admin/queues
```

## Support & Contact

📧 **Email:** parasverma7454@gmail.com  
🐙 **GitHub Issues:** [ReviewScope Issues](https://github.com/yourusername/ReviewScope/issues)  
💬 **Discussions:** [GitHub Discussions](https://github.com/yourusername/ReviewScope/discussions)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

All PRs are reviewed by ReviewScope! 🤖

## License

ReviewScope is proprietary software. See LICENSE file for details.

---

**Built with ❤️ for developers who care about code quality.**
