# ReviewScope – AI-Powered Code Review Automation

Review Scope is an intelligent PR review platform that combines **static analysis**, **semantic context**, and **AI reasoning** to provide comprehensive, fast code reviews on GitHub.

<img width="1200" height="676" alt="856_1x_shots_so" src="https://github.com/user-attachments/assets/baaa7a26-18b4-438b-b764-eed7abc4e7ba" />


## Overview

Review Scope analyzes pull requests end-to-end, evaluating code quality, security, performance, and maintainability. Free plan uses **Sarvam-M** by default, while Pro supports **BYOK** with Gemini/OpenAI.

**Key Capabilities:**
- 🔍 **Static Analysis** – AST-based rule detection (no LLM required, always free)
- 🧠 **AI-Powered Reviews** – Complexity-aware routing between fast (Gemini Flash) and capable (Gemini 3/GPT-5) models
- 📚 **Semantic RAG** – Retrieves relevant code context from your repository's history
- ⚡ **Smart Batching** – Handles large PRs by intelligently chunking files
- 🎯 **Rule Validation** – LLM classifies static findings (valid/false-positive/contextual)
- 💰 **Plan-based key policy** – Free uses server-managed Sarvam; Pro uses your own Gemini/OpenAI keys

## Technology Stack

**Frontend & Dashboard:**
- Next.js 16 (Turbopack)
- TailwindCSS
- NextAuth (GitHub OAuth)

**Backend & Processing:**
- Node.js Worker (background review jobs)
- Drizzle ORM + PostgreSQL
- Redis (caching & rate limiting)

**AI & LLM:**
- Sarvam-M (Free default)
- OpenAI and Gemini models (Pro with BYOK)
- Context Engine (RAG + chunking)

**Integration:**
- GitHub Webhooks (real-time PR events)
- Dodo Payment Gateway (billing integration)
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

## Documentation

- [User Guide](docs/USER_GUIDE.md) - How to install, configure, and use ReviewScope.
- [Architecture](docs/ARCHITECTURE.md) - Deep dive into the system design and data flow.
- [Contributing](CONTRIBUTING.md) - Guide for developers who want to contribute to the project.

## Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis URL (docker-compose)
- GitHub App (for webhooks)
- LLM API keys (`SARVAM_API_KEY` for Free default, user Gemini/OpenAI keys for Pro)

### 1. Clone & Install

```bash
git clone https://github.com/Review-scope/ReviewScope
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
SARVAM_API_KEY=your_sarvam_key
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

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Price | $0 | $15/mo | Contact Sales |
| Repositories | Unlimited | Unlimited | Unlimited |
| Reviews Limit | 60 / month | Unlimited | Unlimited |
| RAG Context | ❌ | ✅ (5 snippets) | ✅ (8+ snippets) |
| Custom Prompts | ❌ | ✅ | ✅ |
| Support | Community | Email | Priority |

**All tiers include:**
- Static analysis (always free)
- AI reviews via your own API keys
- Unlimited files per PR
- DODO payments seamless upgrades

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
- Rate limiting per plan (Free=60/month, Pro/Team=Unlimited)

## Configuration & Customization

### Custom Review Prompts (Pro/Team)

Edit system prompt per repository:
```
Dashboard → Repositories → [Select] → Settings → Custom Prompt
```

### Plan Limits

Edit `apps/worker/src/lib/plans.ts`:
```typescript
FREE: { monthlyReviewsLimit: 60, ragK: 0, allowCustomPrompts: false },
PRO:  { monthlyReviewsLimit: Infinity, ragK: 8, allowCustomPrompts: true },
```

### LLM Model Selection

Edit `packages/llm-core/src/selectModel.ts`:
```typescript
// Complexity thresholds for model routing
if (complexity === "trivial" || complexity === "simple") {
  return "gemini-2.5-flash-lite"; // Lowest cost / Free
} else {
  return "gemini-3-flash"; // Better reasoning for complex changes
}
```


## Support & Contact

📧 **Email:** parasverma7454@gmail.com  
🐙 **GitHub Issues:** [ReviewScope Issues](https://github.com/Review-scope/ReviewScope/issues)  
<!-- 💬 **Discussions:** [GitHub Discussions](https://github.com/Review-scope/ReviewScope/discussions) -->

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

All PRs are reviewed by ReviewScope! 🤖



ReviewScope is proprietary software. See LICENSE file for details. -->

---

**Built with ❤️ for developers who care about code quality.**
