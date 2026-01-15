import type { Rule, PRDiff, RuleViolation } from '../types.js';

export const todoFixmeRule: Rule = {
  id: 'todo-fixme',
  name: 'TODO/FIXME Detection',
  description: 'Flags TODO and FIXME comments in new code',
  check(diff: PRDiff): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const pattern = /\b(TODO|FIXME|HACK|XXX)\b/gi;

    for (const file of diff.files) {
      for (const line of file.additions) {
        const matches = line.content.match(pattern);
        if (matches) {
          violations.push({
            ruleId: this.id,
            file: file.path,
            line: line.lineNumber,
            severity: 'warning',
            message: `Found ${matches[0]} comment - consider tracking in issue tracker`,
          });
        }
      }
    }

    return violations;
  },
};
