import type { Rule, RuleContext, RuleResult } from '../types.js';

export const todoFixmeRule: Rule = {
  id: 'todo-fixme',
  description: 'Flags TODO and FIXME comments in new code',
  severity: 'INFO',
  appliesTo: ['*'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    const pattern = /\b(TODO|FIXME|HACK|XXX)\b/gi;

    for (const line of ctx.file.additions) {
      const matches = line.content.match(pattern);
      if (matches) {
        results.push({
          ruleId: this.id,
          file: ctx.file.path,
          line: line.lineNumber,
          severity: this.severity,
          message: `Found ${matches[0]} comment - consider tracking in issue tracker`,
          snippet: line.content.trim()
        });
      }
    }

    return results;
  }
};
