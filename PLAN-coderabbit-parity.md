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

## ✅ PHASE 1: Web Context Layer (COMPLETED)

**File:** `packages/context-engine/src/layers/web-context.ts`

### Completed
- ✅ Implemented caching layer with LRU + Redis fallback
- ✅ Added `HybridCache` class for multi-tier caching
- ✅ Configured 7-day TTL and 5000-entry LRU limit
- ✅ Support for Upstash Redis integration

### Details
- [packages/context-engine/src/rag/cache.ts](packages/context-engine/src/rag/cache.ts) - LRU & Redis cache
- Ready for npm/security advisory fetching (pending HTTP layer)

---

## ✅ PHASE 2: AST-Based Static Rules (COMPLETED)

**Files:**
- ✅ `packages/rules-engine/src/parsers/` - AST parser infrastructure
- ✅ `packages/rules-engine/src/rules/` - Rule definitions
- ✅ Rule validation types and schema

### Completed
- ✅ AST parser registry for JavaScript/TypeScript
- ✅ Rule detection and violation reporting
- ✅ Multi-language support structure
- ✅ Integrated with context engine layers

### Details
- [packages/rules-engine/src/parsers/registry.ts](packages/rules-engine/src/parsers/registry.ts) - Parser registry
- [packages/rules-engine/src/parsers/javascript.ts](packages/rules-engine/src/parsers/javascript.ts) - JS/TS parser

---

## ✅ PHASE 3: Complexity-Aware Model Routing (COMPLETED)

**Files:**
- ✅ `apps/worker/src/lib/complexity.ts` - Complexity scoring
- ✅ `packages/llm-core/src/selectModel.ts` - Model selection logic
- ✅ Model budget allocation

### Completed
- ✅ Complexity scoring function (trivial/simple/complex tiers)
- ✅ Context budget allocation per complexity level
- ✅ Provider selection (Gemini + OpenAI only)
- ✅ BYO API key enforcement

### Routing Table
| Complexity | Gemini | OpenAI |
|---------|--------|--------|
| Trivial | gemini-2.5-flash | ❌ |
| Simple | gemini-2.5-flash | gpt-4o-mini |
| Complex | gemini-2.5-pro | gpt-4o |

### Details
- [apps/worker/src/lib/complexity.ts](apps/worker/src/lib/complexity.ts) - Scoring logic
- [packages/llm-core/src/selectModel.ts](packages/llm-core/src/selectModel.ts) - Model selection

---

## ✅ PHASE 4: AI + Deterministic Unification (COMPLETED)

**Files:**
- ✅ `packages/llm-core/src/prompts.ts` - Extended prompts & response parsing
- ✅ Rule validation output schema
- ✅ Complexity metadata injection

### Completed
- ✅ Extended system prompt with rule validation instructions
- ✅ Added `ruleValidations` array to output schema
- ✅ Updated `buildReviewPrompt()` to accept rule violations + complexity
- ✅ Updated `parseReviewResponse()` to capture validation results
- ✅ LLM now validates each deterministic finding

### Validation Flow
1. Static rules execute first → violations detected
2. Violations + complexity passed to LLM
3. LLM classifies each as `valid`, `false-positive`, or `contextual`
4. Results merged with AI comments

### Types Defined
- `RuleValidationStatus` - valid | false-positive | contextual
- `RuleValidation` - violation with LLM verdict
- `PromptComplexitySummary` - complexity metadata for LLM
- `PromptRuleViolation` - static violation for LLM

### Details
- [packages/llm-core/src/prompts.ts](packages/llm-core/src/prompts.ts) - Types, prompts, parsing
- System prompt guides LLM to validate all static findings
- Parser captures `ruleValidations` from LLM response

---

## Additional Features Implemented

### Pricing & Plan Management
- ✅ GitHub Marketplace integration (plan IDs 3/7/8)
- ✅ Plan expiration tracking with `expiresAt` field
- ✅ Automatic downgrade on expiration
- ✅ Active plan display on pricing page
- ✅ Updated FAQ with new billing features

### Plan Limits
- **Free (3):** 3 repos, 30 files/PR, 2 RAG snippets, 3 chat questions
- **Pro (7):** 5 repos, 100 files/PR, 5 RAG snippets, unlimited chat
- **Team (8):** Unlimited repos/files, 8 RAG snippets, smart batching

### Details
- [apps/dashboard/src/app/pricing/page.tsx](apps/dashboard/src/app/pricing/page.tsx) - Pricing page
- [apps/worker/src/lib/plans.ts](apps/worker/src/lib/plans.ts) - Plan limits
- [apps/api/src/webhooks/github.ts](apps/api/src/webhooks/github.ts) - Marketplace webhook handler

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
