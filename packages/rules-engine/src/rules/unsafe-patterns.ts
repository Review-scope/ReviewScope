import type { Rule, RuleContext, RuleResult } from '../types.js';

export const unsafePatternsRule: Rule = {
  id: 'unsafe-patterns',
  description: 'Flags potentially unsafe code patterns like innerHTML, document.write',
  severity: 'MAJOR',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    const patterns = [
      { regex: /\.innerHTML\s*=/, message: 'Assignment to innerHTML can lead to XSS attacks.', severity: 'MAJOR' as const },
      { regex: /dangerouslySetInnerHTML\s*[=:]/, message: 'Usage of dangerouslySetInnerHTML should be avoided.', severity: 'MAJOR' as const },
      { regex: /document\.write\s*\(/, message: 'document.write() is discouraged.', severity: 'MINOR' as const },
    ];

    // Skip docs
    if (ctx.file.path.includes('/docs/') || ctx.file.path.startsWith('docs/')) {
      return results;
    }

    for (const line of ctx.file.additions) {
      for (const { regex, message, severity } of patterns) {
        if (regex.test(line.content)) {
          // Skip comments
          if (line.content.trim().startsWith('//')) continue;

          results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: line.lineNumber,
            severity,
            message,
            snippet: line.content.trim()
          });
        }
      }
    }

    return results;
  }
};
