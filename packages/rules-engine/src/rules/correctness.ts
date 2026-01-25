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
  severity: 'MINOR',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx'],
  async detect(ctx: RuleContext): Promise<RuleResult[]> {
    const results: RuleResult[] = [];
    const isRiskyCall = (s: string) => 
      /\bawait\b/.test(s) || 
      /\bfetch\s*\(/.test(s) || 
      /\baxios\./.test(s) || 
      /\bdb\./.test(s) || 
      /\brepository\./.test(s);
    
    const isTryStart = (s: string) => /\btry\s*\{/.test(s);
    const isCatchStart = (s: string) => /\bcatch\b/.test(s);

    const windowSize = 5;
    const additions = ctx.file.additions;
    const fullContent = ctx.file.content;
    let tryRanges: Array<{ start: number; end: number }> = [];

    if (fullContent && /\.(ts|tsx|js|jsx)$/.test(ctx.file.path)) {
      const parsed = (ctx.file as any).parsed;
      if (parsed && parsed.tryCatchBlocks) {
        tryRanges = parsed.tryCatchBlocks
          .map((b: any) => {
            const start = (b.tryStart || b.tryLine || 0) as number;
            const end = (b.tryEnd || start) as number;
            return start > 0 && end >= start ? { start, end } : null;
          })
          .filter(Boolean) as Array<{ start: number; end: number }>;
      } else {
        try {
          const fresh = await ParserRegistry.parse(ctx.file.path, fullContent);
          tryRanges = (fresh.tryCatchBlocks || [])
            .map((b: any) => {
              const start = (b.tryStart || b.tryLine || 0) as number;
              const end = (b.tryEnd || start) as number;
              return start > 0 && end >= start ? { start, end } : null;
            })
            .filter(Boolean) as Array<{ start: number; end: number }>;
        } catch {
          // ignore
        }
      }
    }

    for (let i = 0; i < additions.length; i++) {
      const line = additions[i];
      const content = line.content;

      if (!isRiskyCall(content)) continue;

      let hasLocalHandling = false;
      for (let k = Math.max(0, i - windowSize); k <= Math.min(additions.length - 1, i + windowSize); k++) {
        const neighbor = additions[k].content;
        if (isTryStart(neighbor) || isCatchStart(neighbor)) {
          hasLocalHandling = true;
          break;
        }
      }

      if (!hasLocalHandling) {
        if (tryRanges.length > 0) {
          const withinTry = tryRanges.some(r => line.lineNumber >= r.start && line.lineNumber <= r.end);
          if (!withinTry) {
            results.push({
              ruleId: this.id,
              file: ctx.file.path,
              line: line.lineNumber,
              severity: 'MAJOR',
              message: 'Async/IO call without surrounding try/catch in full file context.',
              snippet: content.trim()
            });
          }
        } else {
          results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: line.lineNumber,
            severity: this.severity,
            message: 'Async/IO call — ensure this is wrapped in try/catch (context not visible in diff).',
            snippet: content.trim()
          });
        }
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
