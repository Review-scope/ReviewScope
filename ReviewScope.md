# ReviewScope — AI PR Reviewer

GitHub Marketplace PR reviewer: customizable, repo-aware, issue-aware, SaaS-ready.

---

## Stack

| Component | Choice | Constraint |
|-----------|--------|------------|
| **Runtime** | Node.js 20+ / TypeScript 5.x | Full Node APIs |
| **API** | Hono + `@hono/node-server` | NO edge |
| **Database** | PostgreSQL + Drizzle | Source of truth |
| **Queue** | BullMQ +  Redis | Queue ONLY |
| **Vector DB** | Qdrant Cloud | Free tier |


---

## Architecture

```mermaid
graph TB
    GH[GitHub Webhooks] --> WH[Webhook Handler]

    WH -->|enqueue| Q[Redis]

    Q --> PROC[Worker]

    PROC --> LLM[llm-core] & CTX[context-engine] & RULES
    [rules-engine]
    
    CTX --> VEC[(Qdrant)]
    
    PROC --> GHAPI[GitHub API]
    
    WH & PROC --> PG[(PostgreSQL)]
```

---

## Folder Structure

```
ReviewScope/
├── apps/
│   ├── api/         # Hono Node.js (minimal)
│   └── worker/      # BullMQ processing
└── packages/
    ├── llm-core/    # No streaming
    ├── context-engine/
    ├── rules-engine/
    └── security/    # AES-256-GCM
```

---

## Key Interfaces

### LLM Provider
```typescript
interface LLMProvider {
  name: string;
  supportsStreaming: false;
  chat(messages: Message[], opts: ChatOptions): Promise<ChatResponse>;
  countTokens(text: string): number;
}
```

### Model Budgets
```typescript
const MODEL_CONTEXT_BUDGET = {
  "gemini-2.5-flash": 16000,
  "gemini-3-flash": 32000,
  "gemini-3-pro": 100000,
};
```

### Context Layers (Enforced)
```typescript
const LAYER_ORDER = [
  "system-guardrails",  // FIRST
  "repo-metadata",
  "issue-intent",
  "rag-context",        // Skip if !indexedAt
  "pr-diff",
  "user-prompt",        // LAST
] as const;
```

---

## Database Schema

```typescript
// reviews
{
  id, repositoryId, prNumber, status, result,
  contextHash,      // Idempotency
  reviewerVersion,  // Model/prompt version tracking
  createdAt
}

// repositories
{
  id, installationId, githubRepoId, fullName,
  indexedAt,        // Guard: skip RAG if null
  settings
}
```

---

## Job Schema

```typescript
interface ReviewJob {
  jobVersion: 1;    // Schema versioning
  installationId: string;
  repoId: string;
  prNumber: number;
  // ...
}
```

---

## Safety Rules

- ❌ Skip draft PRs
- ❌ Skip bot-opened PRs  
- ❌ Skip no-code-change PRs
- ⚠️ Skip RAG if `indexedAt` is null

---

## Redis Constraints

✅ BullMQ jobs, retries, dedup | ❌ Data, configs, keys, locks

---

## Phases

| # | Phase | Days |
|---|-------|------|
| 0 | Foundation | 0-1 |
| 1 | GitHub App | 1-2 |
| 2 | Diff Ingestion | 2-3 |
| 3 | LLM Core | 3-4 |
| 4 | Model System | 4-5 |
| 5 | Context Engine | 5-7 |
| 6 | RAG | 7-10 |
| 7 | Issue Intelligence | 10-11 |
| 8 | Rules Engine | 11-12 |
| 9 | AI Review | 12-14 |
| 10 | GitHub Posting | 14-15 |
| 11 | User Config | 15-17 |
| 12 | Marketplace | 17-19 |
| 13 | Launch | 19-21 |

---

## Status: Launched 🚀

All development phases (0-13) are complete. ReviewScope is now ready for production use and Marketplace listing.
