import type { Rule, PRDiff, RuleViolation } from '../types.js';
import { JavaScriptParser } from '../parsers/javascript.js';

export const unsafePatternsRule: Rule = {
  id: 'unsafe-patterns',
  name: 'Unsafe Patterns',
  description: 'Flags potentially unsafe code patterns like eval, innerHTML, dangerouslySetInnerHTML, document.write',
  check(diff: PRDiff): RuleViolation[] {
    const violations: RuleViolation[] = [];
    
    const patterns = [
      { regex: /\beval\s*\(/, message: 'Avoid using eval() - it is a critical security risk.', severity: 'error' as const },
      { regex: /\.innerHTML\s*=/, message: 'Assignment to innerHTML can lead to XSS attacks - use textContent or a framework binding.', severity: 'error' as const },
      { regex: /dangerouslySetInnerHTML\s*[=:]/, message: 'Usage of dangerouslySetInnerHTML should be avoided unless content is sanitized.', severity: 'error' as const },
      { regex: /document\.write\s*\(/, message: 'document.write() is discouraged - use DOM manipulation instead.', severity: 'warning' as const },
    ];

    for (const file of diff.files) {
      // Skip test files
      if (file.path.includes('.test.') || file.path.includes('.spec.')) {
        continue;
      }

      // Skip documentation files (often contain code samples or text discussing security)
      if (file.path.includes('/docs/') || file.path.startsWith('docs/')) {
        continue;
      }

      for (const line of file.additions) {
        // Clean content (remove strings and comments) to avoid false positives in text/logs
        const cleanContent = JavaScriptParser.removeStringsAndComments(line.content);

        for (const { regex, message, severity } of patterns) {
          if (regex.test(cleanContent)) {
            violations.push({
              ruleId: this.id,
              file: file.path,
              line: line.lineNumber,
              severity,
              message,
            });
          }
        }
      }
    }

    return violations;
  },
};
