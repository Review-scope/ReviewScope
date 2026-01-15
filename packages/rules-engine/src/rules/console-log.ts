import type { Rule, PRDiff, RuleViolation } from '../types.js';
import { ParserRegistry } from '../parsers/index.js';

export const consoleLogRule: Rule = {
  id: 'console-log',
  name: 'Console Log Detection',
  description: 'Flags console.log statements (except in tests and debug functions)',
  check(diff: PRDiff): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const file of diff.files) {
      // Skip test files entirely
      if (file.path.includes('.test.') || file.path.includes('.spec.')) {
        continue;
      }

      // Reconstruct source from additions for parsing
      const sourceCode = file.additions.map(line => line.content).join('\n');
      
      // Parse using language-specific parser
      const parsed = ParserRegistry.parse(file.path, sourceCode);

      // Check console calls
      for (const call of parsed.consoleCalls) {
        // Skip debug context (debug function or intentional logging)
        if (call.context === 'debug') {
          continue;
        }

        // Flag console statements in production code
        if (call.context === 'production') {
          violations.push({
            ruleId: this.id,
            file: file.path,
            line: call.line,
            severity: 'warning',
            message: `console.${call.type}() found in production code - use a logger instead`,
          });
        }
      }
    }

    return violations;
  },
};
