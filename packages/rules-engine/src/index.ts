import type { Rule, PRDiff, RuleResult, RuleContext } from './types.js';
import { matchesGlob } from './utils.js';

// Import rules
import { missingAwaitRule, missingErrorHandlingRule, unsafeJsonParseRule } from './rules/correctness.js';
import { hardcodedSecretRule, unvalidatedInputRule } from './rules/safety.js';
import { silentCatchRule, missingNullCheckRule } from './rules/reliability.js';
import { fatControllerRule, duplicateLogicRule } from './rules/architecture.js';
import { unsafeAiOutputRule, promptAsLogicRule } from './rules/ai-sanity.js';
import { nPlusOneRule, unboundedLoopRule } from './rules/performance.js';
import { issueMismatchRule, overengineeringRule } from './rules/reviewscope.js';
import { todoFixmeRule } from './rules/todo-fixme.js';
import { consoleLogRule } from './rules/console-log.js';
import { unsafePatternsRule } from './rules/unsafe-patterns.js';

// Export types
export type { Rule, PRDiff, DiffFile, DiffLine, RuleResult, RuleContext } from './types.js';
export type { ReviewScopeConfig } from './config.js';
// Backward compatibility
export type RuleViolation = RuleResult;

// Register all rules
export const allRules: Rule[] = [
  // Correctness
  missingAwaitRule, missingErrorHandlingRule, unsafeJsonParseRule,
  // Safety
  hardcodedSecretRule, unvalidatedInputRule,
  // Reliability
  silentCatchRule, missingNullCheckRule,
  // Architecture
  fatControllerRule, duplicateLogicRule,
  // AI Sanity
  unsafeAiOutputRule, promptAsLogicRule,
  // Performance
  nPlusOneRule, unboundedLoopRule,
  // ReviewScope
  issueMismatchRule, overengineeringRule,
  // General/Legacy
  todoFixmeRule,
  consoleLogRule,
  unsafePatternsRule
];

import type { ReviewScopeConfig } from './config.js';

/**
 * Run all registered rules against a PR diff
 */
export function runRules(diff: PRDiff, config?: ReviewScopeConfig, rules: Rule[] = allRules): RuleResult[] {
  const results: RuleResult[] = [];
  const disabled = new Set(config?.disabledRules || []);

  // Deduplication Set
  const seen = new Set<string>();

  for (const rule of rules) {
    if (disabled.has(rule.id)) continue;

    for (const file of diff.files) {
      // Check if rule applies to this file
      const applies = rule.appliesTo.some(glob => matchesGlob(file.path, glob));
      if (!applies) continue;

      const ctx: RuleContext = { file, diff };
      const ruleResults = rule.detect(ctx);

      if (ruleResults) {
        for (const res of ruleResults) {
           // Create a unique key for deduplication
           const key = `${res.ruleId}:${res.file}:${res.line}:${res.message}`;
           if (!seen.has(key)) {
             seen.add(key);
             results.push(res);
           }
        }
      }
    }
  }

  return results;
}
