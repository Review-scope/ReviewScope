import type { Rule, RuleContext, RuleResult } from '../types.js';
import { ParserRegistry } from '../parsers/index.js';

export const missingAwaitRule: Rule = {
  id: 'missing-await',
  description: 'Promise returned without await or .then() without .catch()',
  severity: 'CRITICAL',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    for (const line of ctx.file.additions) {
      // 1. .then() without .catch()
      if (line.content.includes('.then(') && !line.content.includes('.catch(')) {
        // Simple single-line check. Multi-line is harder with line-by-line iteration.
        // For now, flag it if .catch is not on the same line.
        // Ideally we check context.
        results.push({
          ruleId: this.id,
          file: ctx.file.path,
          line: line.lineNumber,
          severity: this.severity,
          message: 'Promise chain using .then() should handle errors with .catch()',
          snippet: line.content.trim()
        });
      }
    }
    return results;
  }
};

export const missingErrorHandlingRule: Rule = {
  id: 'missing-error-handling',
  description: 'Async operations or risky calls without error handling',
  severity: 'CRITICAL',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx'],
  async detect(ctx: RuleContext): Promise<RuleResult[]> {
    const results: RuleResult[] = [];
    
    // Reconstruct source from additions for AST parsing
    const sourceCode = ctx.file.additions.map(line => line.content).join('\n');
    
    // Parse using language-specific parser
    const parsed = await ParserRegistry.parse(ctx.file.path, sourceCode);

    // 1. Check for empty catch blocks
    for (const block of parsed.tryCatchBlocks) {
      if (block.isEmpty) {
        // Map relative line to absolute line
        const addition = ctx.file.additions[block.catchLine - 1];
        if (addition) {
          results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: addition.lineNumber,
            severity: this.severity,
            message: `Empty catch block detected. Errors should be handled or logged.`,
            snippet: addition.content.trim()
          });
        }
      }
    }

    // 2. Check for async functions without try-catch
    for (const asyncFunc of parsed.asyncFunctions) {
      if (asyncFunc.hasAwait) {
        const hasCatch = parsed.tryCatchBlocks.some(
          block => Math.abs(block.tryLine - asyncFunc.line) < 20 // Heuristic: catch nearby
        );

        if (!hasCatch && asyncFunc.name) {
           const addition = ctx.file.additions[asyncFunc.line - 1];
           if (addition) {
             results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: addition.lineNumber,
                severity: this.severity,
                message: `Async function '${asyncFunc.name}' uses await but has no try-catch block nearby.`,
                snippet: addition.content.trim()
             });
           }
        }
      }
    }

    // 3. Fallback/Extra: JSON.parse checks (heuristic)
    for (const line of ctx.file.additions) {
        if (line.content.includes('JSON.parse(') && !line.content.includes('try {')) {
             // This is covered by unsafe-json-parse but good to double check or ignore
        }
    }
    
    return results;
  }
};

export const unsafeJsonParseRule: Rule = {
  id: 'unsafe-json-parse',
  description: 'JSON.parse() used without try-catch block',
  severity: 'CRITICAL',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    for (const line of ctx.file.additions) {
      if (line.content.includes('JSON.parse(')) {
        // We can't easily check for surrounding try/catch in a diff line.
        // But we can flag it as a potential risk.
        results.push({
          ruleId: this.id,
          file: ctx.file.path,
          line: line.lineNumber,
          severity: this.severity,
          message: 'Unsafe JSON.parse() detected. Ensure this is wrapped in a try-catch block.',
          snippet: line.content.trim()
        });
      }
    }
    return results;
  }
};
