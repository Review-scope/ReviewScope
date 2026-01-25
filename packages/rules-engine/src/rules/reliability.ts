import type { Rule, RuleContext, RuleResult } from '../types.js';
import { ParserRegistry } from '../parsers/index.js';

export const silentCatchRule: Rule = {
  id: 'silent-catch',
  description: 'Empty or silent catch block detected',
  severity: 'MAJOR',
  appliesTo: ['*.ts', '*.js', '*.tsx', '*.jsx', '*.java', '*.py'],
  async detect(ctx: RuleContext): Promise<RuleResult[]> {
    const results: RuleResult[] = [];
    
    const additions = ctx.file.additions;
    for (let i = 0; i < additions.length; i++) {
      const line = additions[i];
      const s = line.content;

      if (/catch\s*(\(\s*\w+\s*\))?\s*\{\s*\}/.test(s) || /catch\s*(\(\s*\w+\s*\))?\s*\{\s*\/\/.*?\}/.test(s) || /catch\s*\{\s*\}/.test(s)) {
        results.push({
          ruleId: this.id,
          file: ctx.file.path,
          line: line.lineNumber,
          severity: this.severity,
          message: 'Silent catch block detected. Always handle or log errors.',
          snippet: s.trim()
        });
        continue;
      }

      if (/catch\b/.test(s) && /\{/.test(s)) {
        let depth = 1;
        let hasStatement = false;
        for (let j = i + 1; j < additions.length && depth > 0; j++) {
          const t = additions[j].content;
          const opens = (t.match(/\{/g) || []).length;
          const closes = (t.match(/\}/g) || []).length;
          depth += opens;
          depth -= closes;

          const trimmed = t.trim();
          const isComment = /^\/\/|^\/\*|\*\/$/.test(trimmed);
          const isOnlyBrace = trimmed === '}' || trimmed === '{';
          const isEmpty = trimmed.length === 0;
          
          if (!isEmpty && !isComment && !isOnlyBrace) {
            hasStatement = true;
          }

          if (depth === 0) {
            if (!hasStatement) {
              results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: line.lineNumber,
                severity: this.severity,
                message: 'Empty catch block detected. Handle or log errors inside the catch.',
                snippet: s.trim()
              });
            }
            break;
          }
        }
      }
    }

    if (ctx.file.path.endsWith('.py')) {
      for (let i = 0; i < additions.length; i++) {
        const s = additions[i].content;
        if (/except\s*:\s*pass/.test(s)) {
          results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: additions[i].lineNumber,
            severity: this.severity,
            message: 'Silent exception handling detected (except: pass).',
            snippet: s.trim()
          });
        } else if (/^except\b/.test(s.trim())) {
          const next = additions[i + 1]?.content.trim() || '';
          if (/^pass$/.test(next)) {
            results.push({
              ruleId: this.id,
              file: ctx.file.path,
              line: additions[i].lineNumber,
              severity: this.severity,
              message: 'Silent exception handling detected (except then pass).',
              snippet: s.trim()
            });
          }
        }
      }
    }

    // AST-assisted detection for Java/C/C++/Go using full content when available
    if (/\.(java|c|cpp|h|hpp|go)$/.test(ctx.file.path) && ctx.file.content) {
      try {
        const parsed = (ctx.file as any).parsed ?? await ParserRegistry.parse(ctx.file.path, ctx.file.content);
        for (const block of parsed.tryCatchBlocks || []) {
          if (block.isEmpty) {
            // Map to nearest added line within catch block range if possible
            const targetLine = additions.find(a => a.lineNumber === block.catchLine)?.lineNumber
              ?? additions.find(a => a.lineNumber >= block.catchLine)?.lineNumber
              ?? additions[0]?.lineNumber;
            if (typeof targetLine === 'number') {
              results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: targetLine,
                severity: this.severity,
                message: 'Empty catch block detected (AST). Handle or log errors.',
                snippet: additions.find(a => a.lineNumber === targetLine)?.content?.trim() || 'catch {...}'
              });
            }
          }
        }
      } catch {
        // ignore parser errors
      }
    }
    return results;
  }
};

export const missingNullCheckRule: Rule = {
  id: 'missing-null-check',
  description: 'Potential missing null check or unsafe access',
  severity: 'MAJOR',
  appliesTo: ['*.ts', '*.tsx'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    // This is hard to do robustly with regex.
    // We'll look for simple patterns like accessing nested properties without optional chaining
    // in contexts that often require it (like API responses).
    // Heuristic: If we see `data.something.else` deep access without `?`.
    
    for (const line of ctx.file.additions) {
        // Very basic heuristic: multiple dot access on common risky objects
        if (/(response|data|payload|res|req)\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+/.test(line.content) && !line.content.includes('?.')) {
            // Low confidence, but flagged as potential issue
            // Skipping for now to avoid noise, or adding with specific warning
            /* 
            results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: line.lineNumber,
                severity: 'INFO', // Downgraded to INFO
                message: 'Deep property access detected. Consider using optional chaining (?.) if intermediate values can be null.',
                snippet: line.content.trim()
            });
            */
        }
    }
    return results;
  }
};
