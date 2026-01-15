import type { Rule, PRDiff, RuleViolation } from '../types.js';

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

      for (const line of file.additions) {
        for (const { regex, message, severity } of patterns) {
          // Check if pattern matches, but exclude if it's in a string or comment
          const content = line.content;
          
          // Simple check: skip if line starts with // or contains only strings
          if (content.trim().startsWith('//') || content.trim().startsWith('*')) {
            continue;
          }

          if (regex.test(content)) {
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
