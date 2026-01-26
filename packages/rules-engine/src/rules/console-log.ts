import type { Rule, RuleContext, RuleResult } from '../types.js';

export const consoleLogRule: Rule = {
  id: 'console-log',
  description: 'Flags problematic console.log statements (secrets, loops, swallowed errors)',
  severity: 'MINOR',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];

    // Skip test files
    if (ctx.file.path.includes('.test.') || ctx.file.path.includes('.spec.') || ctx.file.path.includes('__tests__')) {
      return results;
    }

    const secretRegex = /(password|secret|key|token|auth|credential|bearer)/i;

    // Use AST if available (Preferred)
    if (ctx.file.parsed && (ctx.file.parsed as any).consoleCalls) {
        const parsed = ctx.file.parsed as any;
        const additionLines = new Set(ctx.file.additions.map(a => a.lineNumber));

        for (const call of parsed.consoleCalls) {
            // Only report on lines that were added/modified in this PR
            if (!additionLines.has(call.line)) continue;

            // 1. Secrets (CRITICAL)
            // Check content of the call arguments (heuristic via line content)
            if (secretRegex.test(call.content)) {
                results.push({
                    ruleId: this.id,
                    file: ctx.file.path,
                    line: call.line,
                    severity: 'CRITICAL',
                    message: 'Potential secret logged to console. Ensure no sensitive data is printed.',
                    snippet: call.content.trim()
                });
                continue; 
            }

            // 2. Catch without rethrow (MAJOR)
            if (call.inCatchWithoutRethrow) {
                results.push({
                    ruleId: this.id,
                    file: ctx.file.path,
                    line: call.line,
                    severity: 'MAJOR',
                    message: 'Error logged in catch block but not rethrown. This swallows the error.',
                    snippet: call.content.trim()
                });
                continue;
            }

            // 3. Loops (MINOR)
            if (call.inLoop) {
                results.push({
                    ruleId: this.id,
                    file: ctx.file.path,
                    line: call.line,
                    severity: 'MINOR',
                    message: 'Console log inside a loop. This can flood logs and degrade performance.',
                    snippet: call.content.trim()
                });
                continue;
            }

            // 4. Default: Ignore (clean code suggestions are disabled by default)
        }
    } else {
        // Fallback: Regex on additions (Only checks for secrets)
        for (const line of ctx.file.additions) {
             if (/console\.(log|warn|error|info|debug)\s*\(/.test(line.content)) {
                 if (line.content.trim().startsWith('//')) continue;

                 // Secrets (CRITICAL)
                 if (secretRegex.test(line.content)) {
                     results.push({
                        ruleId: this.id,
                        file: ctx.file.path,
                        line: line.lineNumber,
                        severity: 'CRITICAL',
                        message: 'Potential secret logged to console. Ensure no sensitive data is printed.',
                        snippet: line.content.trim()
                     });
                 }
             }
        }
    }

    return results;
  }
};

