# Plan: Level Up ReviewScope to CodeRabbit Parity

**TL;DR:** ReviewScope already implements ~70% of CodeRabbit's core architecture (RAG, context layering, hybrid static + AI analysis).  
To reach parity, we will add:

1. Real-time web context (dependency & security data)
2. AST-based static rules (replacing regex-only checks)
3. Complexity-aware model selection (Gemini + OpenAI only)
4. Unified AI + deterministic decision-making

Implementation is phased to minimize risk and cost.

---

## Implementation Steps

---

## 1. Add Web Context Layer

**File:** `packages/context-engine/src/layers/web-context.ts`

### Responsibilities
- Fetch **npm package versions**, **security advisories**, and **framework metadata**
- Provide factual, real-time data to reduce hallucinations
- Execute *after RAG context* and *before PR diff analysis*

### Integration
- Insert at **Layer Position 4.5** (after `rag-context`, before `pr-diff`)
- Update:
  - `packages/context-engine/src/layers.ts`
  - `LAYER_ORDER` constant
  - `ContextInput` to accept optional web query config

### Technical Notes
- HTTP: `axios` or `node-fetch`
- Caching:
  - Redis (primary, 7-day TTL)
  - LRU cache (fallback)
- Rate-limited per `installationId + repoId`

### Dependencies
- `axios` (or `node-fetch`)
- `redis`
- `lru-cache`

---

## 2. Upgrade Static Rules to AST Parsing

**Files:**
- `packages/rules-engine/src/rules/*.ts`
- `packages/rules-engine/src/parsers/` (new)

### Changes
- Introduce AST-based analysis for JavaScript / TypeScript
- Replace regex-only rules where context matters

### AST-Based Rules
- `missing-error-handling.ts`
  - Detect uncaught promises
  - Detect incomplete `try/catch`
- `unsafe-patterns.ts`
  - Deep AST traversal for unsafe usage
- `console-log.ts`
  - Detect runtime vs test vs intentional logging
- `todo-fixme.ts`
  - Keep regex (low value to AST)

### Fallback Strategy
- Regex remains for:
  - Unsupported languages
  - Simple string-based rules

### Solved Limitations
- Multi-line logic detection
- Async error handling gaps
- Context-aware severity classification
- Circular dependency groundwork

### Dependencies
- `typescript`
- `@babel/parser`
- `@swc/core` (optional, performance)

---

## 3. Implement Complexity-Aware Model Routing (Gemini + OpenAI Only)

**Files:**
- `apps/worker/src/jobs/review.ts`
- `packages/context-engine/src/assembler.ts`
- `packages/llm-core/src/modelRegistry.ts`
- `packages/llm-core/src/selectModel.ts`

### Complexity Scoring
Introduce `getComplexityScore()`:

- **Trivial (0–2):**
  - Docs, config changes, single-line fixes
- **Simple (3–6):**
  - Isolated bug fixes, small refactors
- **Complex (7+):**
  - Multi-file changes, architecture, security fixes

### Provider Rules (BYO API Key Only)
- If user provides **Gemini key → Gemini used**
- If user provides **OpenAI key → OpenAI used**
- No API key → **AI review disabled (static-only)**

> ❌ No OpenRouter  
> ❌ No provider auto-switching

### Model Routing Table

| Complexity | Gemini | OpenAI |
|---------|--------|--------|
| Trivial | gemini-2.5-flash | ❌ |
| Simple | gemini-2.5-flash | gpt-4o-mini |
| Complex | gemini-2.5-pro | gpt-4o / gpt-4o-mini |

### Context Budget Allocation
- Gemini:
  - Simple: ~6k tokens
  - Complex: ~12k tokens
- OpenAI:
  - Simple: ~9k tokens
  - Complex: ~20k tokens

**Result:**  
30–40% LLM cost reduction with no quality loss.

---

## 4. Unify AI + Deterministic Reviews

**Files:**
- `packages/llm-core/src/prompts/*`
- `apps/worker/src/jobs/review.ts`

### Flow
1. Static rules run first
2. Rule violations passed to LLM
3. LLM validates each finding

### AI Classification
Each rule is marked as:
- `valid` → report normally
- `false-positive` → suppress
- `contextual` → downgrade severity

### Example

```
Rule: console.log in auth/login.ts line 42
AI: "Intentional authentication logging"
Result: INFO (not WARNING)
```

### Safety Rules
- BLOCKER / CRITICAL findings **cannot be suppressed**
- Deduplication enforced via database

---

## 5. Web Query Rate Limiting & Caching

**Files:**
- `apps/api/src/db/schema.ts`
- `packages/context-engine/src/layers/web-context.ts`
- `packages/context-engine/src/rag/cache.ts`

### Rate Limits
- Free: 5 queries / month
- Pro: 50 queries / month
- Team: 500 queries / month

### Cache Strategy
- Redis hot cache (7 days)
- LRU fallback
- Shared embeddings for repeated queries

### Schema
```sql
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY,
  installationId UUID REFERENCES installations(id),
  repoId UUID REFERENCES repositories(id),
  query TEXT,
  apiService TEXT,
  tokensUsed INT,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_usage_daily
ON api_usage_logs (installationId, DATE(createdAt));
```

---

## 6. Testing & Validation

### Test Coverage
- AST rule unit tests
- Context layer ordering tests
- End-to-end PR reviews
- Performance benchmarks

### Validation Checklist
- [ ] No context budget overflow
- [ ] Web layer failures are non-blocking
- [ ] No duplicate findings
- [ ] Complexity routing accuracy
- [ ] Rate limits enforced
- [ ] Cost reduction ≥ 30%

---

## Phase Strategy

### Option A — Sequential (Recommended)

**Phase 1:** Web Context Layer (Week 1–2)
- Implement npm + security advisories
- Add caching layer
- Deploy behind feature flag

**Phase 2:** AST Rules for JS/TS (Week 3–4)
- Start with `missing-error-handling.ts`
- Add AST parser infrastructure
- Validate against test suite

**Phase 3:** Complexity-Aware Routing (Week 5–6)
- Implement scoring function
- Add model selection logic
- A/B test with real PRs

**Phase 4:** AI + Deterministic Unification (Week 7–8)
- Update LLM prompts
- Merge findings with validation
- Full end-to-end testing

**Timeline:** 2 months  
**Risk:** Low (each phase is isolated)  
**Deploy Strategy:** Feature flags for gradual rollout

### Option B — Parallel (Faster, Higher Risk)

**Sprint 1 (Week 1–3):**
- Web Context + Simple AST Rules

**Sprint 2 (Week 4–6):**
- Complexity Routing + Unification + Caching

**Sprint 3 (Week 7):**
- Testing, bug fixes, documentation

**Timeline:** 1.5 months  
**Risk:** Medium (coordinated effort, more integration testing)  
**Deploy Strategy:** Single coordinated release

---

## Scope Decisions

### 1. Web Query Scope

**Narrow Scope (Recommended):**
- npm package versions
- npm security advisories
- GitHub API metadata

**Cost:** $10–20/month  
**Hallucination Risk:** Low  
**Implementation:** 2–3 weeks

**Broad Scope (Future):**
- + GitHub repo search
- + Stack Overflow snippets
- + Framework docs

**Cost:** $50–100/month  
**Hallucination Risk:** Medium–High  
**Implementation:** 6–8 weeks

**Recommendation:** Start narrow, expand after Phase 1 validation.

---

### 2. AST Language Coverage

**TypeScript/JavaScript Only (Recommended):**
- Covers ~80% of typical codebases
- Clear ROI
- Uses `typescript` + `@babel/parser`

**Implementation:** 2–3 weeks

**Multi-Language (Future):**
- Python: `ast` module
- Go: `go/parser`
- Covers ~95% of codebases

**Implementation:** 6–8 weeks  
**Maintenance Burden:** High

**Recommendation:** JS/TS in Phase 1; add others on demand.

---

### 3. Cost Impact & Pricing

**Web Queries:**
- Add external API costs
- Recommend 5–50 queries/month per tier (quota enforcement)
- Feature-flag for Pro/Team tiers

**Complexity Routing:**
- Saves 30–40% on LLM costs
- Pass savings to customers (lower price) or reinvest

**AST Parsing:**
- Minimal cost
- Faster rule evaluation (no LLM call for obvious violations)

**Recommendation:**  
Price web queries as premium feature (Pro/Team only); promote complexity routing as cost benefit for all tiers.

---

## Success Metrics

After full implementation (all 4 phases), ReviewScope achieves:

### Feature Parity with CodeRabbit
- ✅ RAG + context layering (done)
- ✅ Real-time data (web queries)
- ✅ AST-based rules (vs. regex-only)
- ✅ Intelligent model selection (vs. uniform)
- ✅ Unified AI+deterministic (vs. separate)

### Business Metrics
- 30%+ reduction in LLM API spend
- 20%+ increase in relevant findings
- 50% fewer false positives
- Faster reviews for simple changes (<30 seconds)
- Deeper analysis for complex changes

---

## Open Questions

1. **Deprecate old regex rules?** Keep for backward compat or full AST migration?
2. **Web query failure handling?** Degrade to cache? Skip layer? Fail review?
3. **Customizable complexity per repo?** (some teams want all PRs as "complex")
4. **Expose AST + web queries in API?** (third-party extensions)
5. **Acceptable latency increase?** (typically +500ms–1s per web query)

---

## Next Steps

1. Review this plan with the team
2. Confirm Phase 1 (Web Context Layer) scope and timeline
3. Set up feature flags for gradual rollout
4. Begin Phase 1 implementation
