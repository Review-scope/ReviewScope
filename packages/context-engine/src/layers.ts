/**
 * Context Layers - Enforced Order
 */
export const LAYER_ORDER = [
  'system-guardrails',  // 1. FIRST - non-overridable
  'repo-metadata',      // 2. Stack, conventions
  'issue-intent',       // 3. PR ↔ Issue link
  'rag-context',        // 4. Retrieved code
  'web-context',        // 4.5. Dependency & security data
  'pr-diff',            // 5. Changed files
  'user-prompt',        // 6. LAST - sandboxed
] as const;

export type LayerName = typeof LAYER_ORDER[number];

export interface ContextLayer {
  name: LayerName;
  /**
   * Maximum tokens allowed for this layer during assembly.
   * If a layer exceeds this, the assembler will truncate it.
   */
  maxTokens?: number;
  getContext(input: ContextInput): Promise<string>;
}

export interface ContextInput {
  repositoryFullName: string;
  prNumber: number;
  prTitle: string;
  prBody: string;
  diff: string;
  issueContext?: string;
  ragContext?: string;
  webContext?: string;
  userPrompt?: string;
  ruleViolations?: unknown[]; // Static rule violations for LLM validation
  indexedAt?: Date | null;
}
