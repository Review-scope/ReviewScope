import type { Rule, PRDiff, RuleViolation } from '../types.js';
import { ParserRegistry } from '../parsers/index.js';

export const missingErrorHandlingRule: Rule = {
  id: 'missing-error-handling',
  name: 'Missing Error Handling',
  description: 'Flags empty catch blocks and unhandled promise rejections',
  check(diff: PRDiff): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const file of diff.files) {
      // Reconstruct source from additions/deletions for parsing
      const sourceCode = file.additions.map(line => line.content).join('\n');
      
      // Parse using language-specific parser
      const parsed = ParserRegistry.parse(file.path, sourceCode);

      // Check for empty catch blocks
      for (const block of parsed.tryCatchBlocks) {
        if (block.isEmpty) {
          violations.push({
            ruleId: this.id,
            file: file.path,
            line: block.catchLine,
            severity: 'warning',
            message: `Empty catch block (line ${block.catchLine}) - error is silently swallowed`,
          });
        }
      }

      // Check for async functions without try-catch (optional warning)
      for (const asyncFunc of parsed.asyncFunctions) {
        // Only flag if the async function has await but no try-catch nearby
        if (asyncFunc.hasAwait) {
          const hasCatch = parsed.tryCatchBlocks.some(
            block => Math.abs(block.tryLine - asyncFunc.line) < 20
          );

          if (!hasCatch && asyncFunc.name) {
            violations.push({
              ruleId: this.id,
              file: file.path,
              line: asyncFunc.line,
              severity: 'suggestion',
              message: `Async function '${asyncFunc.name}' uses await but has no try-catch for promise rejection handling`,
            });
          }
        }
      }
    }

    return violations;
  },
};
