import type { Rule, RuleContext, RuleResult } from '../types.js';

export const consoleLogRule: Rule = {
  id: 'console-log',
  description: 'Flags console.log statements (except in tests)',
  severity: 'MINOR',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];

    // Skip test files
    if (ctx.file.path.includes('.test.') || ctx.file.path.includes('.spec.')) {
      return results;
    }

    for (const line of ctx.file.additions) {
      // Simple regex check for console.log/warn/error
      if (/console\.(log|warn|error|info|debug)\s*\(/.test(line.content)) {
        // Skip comments (simple check)
        if (line.content.trim().startsWith('//')) continue;
        
        results.push({
          ruleId: this.id,
          file: ctx.file.path,
          line: line.lineNumber,
          severity: this.severity,
          message: 'Console statement detected. Use a proper logger in production code.',
          snippet: line.content.trim()
        });
      }
    }

    return results;
  }
};

