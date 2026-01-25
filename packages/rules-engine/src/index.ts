import type { Rule, PRDiff, RuleResult, RuleContext, DiffFile } from './types.js';
import { matchesGlob } from './utils.js';
import { ParserRegistry } from './parsers/index.js';

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
export async function runRules(diff: PRDiff, config?: ReviewScopeConfig, rules: Rule[] = allRules): Promise<RuleResult[]> {
  const results: RuleResult[] = [];
  const disabled = new Set(config?.disabledRules || []);

  // Deduplication Set
  const seen = new Set<string>();
  
  // Parse cache: attach parsed AST-like info to files when full content is available
  await Promise.all(diff.files.map(async (file: DiffFile) => {
    if (file.content && typeof file.parsed === 'undefined') {
      try {
        file.parsed = await ParserRegistry.parse(file.path, file.content);
      } catch {
        // ignore parser failures; rules may fall back to heuristics
      }
    }
  }));

  for (const rule of rules) {
    if (disabled.has(rule.id)) continue;

    for (const file of diff.files) {
      // Check if rule applies to this file
      const applies = rule.appliesTo.some(glob => matchesGlob(file.path, glob));
      if (!applies) continue;

      const ctx: RuleContext = { file, diff };
      const ruleResults = await rule.detect(ctx);

      if (ruleResults) {
        for (const res of ruleResults) {
           // Stable deduplication key: rule ID + file + line
           const key = `${res.ruleId}:${res.file}:${res.line}`;
           if (!seen.has(key)) {
             seen.add(key);
             results.push(res);
           }
        }
      }
    }
  }

  // Post-processing: Global Aggregation by Rule + File + Message
  // This handles both consecutive lines AND identical issues separated by distance.
  
  // 1. Group by unique key
  const groups = new Map<string, RuleResult[]>();
  
  for (const res of results) {
    // Key must include file, ruleId, and the message text
    const key = `${res.file}::${res.ruleId}::${res.message}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(res);
  }

  const aggregated: RuleResult[] = [];

  // 2. Process each group
  for (const group of groups.values()) {
    if (group.length === 1) {
      aggregated.push(group[0]);
      continue;
    }

    // Sort by line number
    group.sort((a, b) => a.line - b.line);

    const lines = group.map(r => r.line);
    const ranges: string[] = [];
    
    let start = lines[0];
    let end = lines[0];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === end + 1) {
        end = lines[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = lines[i];
        end = lines[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);

    // Update the first result's message to include all ranges
    const primary = group[0];
    // Avoid double-appending if the message already has "lines ..." (though unlikely with this logic)
    primary.message = `${primary.message} (lines ${ranges.join(', ')})`;
    
    aggregated.push(primary);
  }

  // Sort final results for deterministic output
  return aggregated.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.ruleId !== b.ruleId) return a.ruleId.localeCompare(b.ruleId);
    return a.line - b.line;
  });
}
