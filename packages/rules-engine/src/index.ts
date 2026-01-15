import type { Rule, PRDiff, RuleViolation } from './types.js';
import { todoFixmeRule } from './rules/todo-fixme.js';
import { consoleLogRule } from './rules/console-log.js';
import { missingErrorHandlingRule } from './rules/missing-error-handling.js';
import { unsafePatternsRule } from './rules/unsafe-patterns.js';

// Export types
export type { Rule, PRDiff, DiffFile, DiffLine, RuleViolation } from './types.js';
export type { ReviewScopeConfig } from './config.js';

// Export rules
export { 
  todoFixmeRule, 
  consoleLogRule, 
  missingErrorHandlingRule, 
  unsafePatternsRule 
};

// Default rules
const defaultRules: Rule[] = [
  todoFixmeRule, 
  consoleLogRule,
  missingErrorHandlingRule,
  unsafePatternsRule
];

import type { ReviewScopeConfig } from './config.js';

/**
 * Run all registered rules against a PR diff
 */
export function runRules(diff: PRDiff, config?: ReviewScopeConfig, rules: Rule[] = defaultRules): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const disabled = new Set(config?.disabledRules || []);

  for (const rule of rules) {
    if (disabled.has(rule.id)) continue;
    
    const ruleViolations = rule.check(diff);
    violations.push(...ruleViolations);
  }

  return violations;
}
