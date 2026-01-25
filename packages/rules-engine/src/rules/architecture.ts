import type { Rule, RuleContext, RuleResult, PRDiff } from '../types.js';

export const fatControllerRule: Rule = {
  id: 'fat-controller',
  description: 'Controller or Route handler seems overly complex (Business logic leak)',
  severity: 'MINOR',
  appliesTo: ['*controller*', '*route*', '*/api/*'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    // Check if file is in a controller/route path
    const isController = /controller|route|api/i.test(ctx.file.path);
    if (!isController) return results;

    // Heuristic: Count lines in additions. If adding a huge chunk to a controller, warn.
    if (ctx.file.additions.length > 50) {
        // Simple heuristic: large additions to controller
        results.push({
            ruleId: this.id,
            file: ctx.file.path,
            line: ctx.file.additions[0].lineNumber,
            severity: this.severity,
            message: 'Large logic block detected in Controller/Route layer. Consider moving business logic to a Service or UseCase.',
            snippet: `+${ctx.file.additions.length} lines`
        });
    }

    // Heuristic: Direct DB calls in controller (e.g., SQL or ORM)
    for (const line of ctx.file.additions) {
        if (/db\.|repository\.|findMany|findOne|executeQuery/.test(line.content)) {
             results.push({
                ruleId: this.id,
                file: ctx.file.path,
                line: line.lineNumber,
                severity: this.severity,
                message: 'Direct database access detected in Controller. Use a Service layer.',
                snippet: line.content.trim()
            });
        }
    }

    return results;
  }
};

export const duplicateLogicRule: Rule = {
  id: 'duplicate-logic',
  description: 'Identical code blocks detected in multiple files',
  severity: 'MINOR',
  appliesTo: ['*'],
  detect(ctx: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    
    // Exclude config/lock files from duplicate checks
    if (/\.(json|lock|yaml|yml|toml|md|txt)$/i.test(ctx.file.path)) return results;
    if (/(package|yarn|pnpm|bun)\.lock$/i.test(ctx.file.path)) return results;

    const MIN_LINES = 3;

    const normalize = (s: string) => s.replace(/\s+/g, '');

    const cache = duplicateLogicIndexCache.get(ctx.diff) ?? buildDuplicateIndex(ctx.diff, MIN_LINES, normalize);
    if (!duplicateLogicIndexCache.has(ctx.diff)) {
      duplicateLogicIndexCache.set(ctx.diff, cache);
    }

    const additions = ctx.file.additions;
    if (additions.length < MIN_LINES) return results;

    const blocks: { signature: string; line: number; content: string }[] = [];
    for (let i = 0; i <= additions.length - MIN_LINES; i++) {
      let isConsecutive = true;
      let content = '';
      for (let k = 0; k < MIN_LINES; k++) {
        if (k > 0 && additions[i + k].lineNumber !== additions[i + k - 1].lineNumber + 1) {
          isConsecutive = false;
          break;
        }
        content += additions[i + k].content;
      }
      if (!isConsecutive) continue;

      const trimmed = content.trim();
      if (trimmed.length < 20) continue;
      if (/^(import|export|const|let|var|package|return)/.test(trimmed)) continue;

      blocks.push({
        signature: normalize(content),
        line: additions[i].lineNumber,
        content: additions[i].content
      });
    }

    
    // 1. Collect all matches first
    const matches: { line: number; endLine: number; others: string[]; content: string }[] = [];
    
    for (const block of blocks) {
      const occ = cache.get(block.signature);
      if (!occ) continue;

      const paths = Array.from(new Set(occ.map(o => o.path)));
      if (paths.length <= 1) continue; // only present in this file

      const leader = paths.sort()[0];
      if (ctx.file.path !== leader) continue;

      const others = paths.filter(p => p !== ctx.file.path);
      matches.push({
        line: block.line,
        endLine: block.line + MIN_LINES - 1,
        others,
        content: block.content
      });
    }

    // 2. Merge overlapping matches
    matches.sort((a, b) => a.line - b.line);
    
    const merged: typeof matches = [];
    if (matches.length > 0) {
      let current = matches[0];
      for (let i = 1; i < matches.length; i++) {
        const next = matches[i];
        // If next block overlaps or is adjacent to current
        if (next.line <= current.endLine + 1) {
          // Merge
          current.endLine = Math.max(current.endLine, next.endLine);
          // Union of 'others' (though usually they should be the same for identical logic blocks)
          current.others = Array.from(new Set([...current.others, ...next.others]));
        } else {
          merged.push(current);
          current = next;
        }
      }
      merged.push(current);
    }

    // 3. Generate results
    for (const m of merged) {
       const othersFormatted = m.others.map(o => `\`${o}\``).join(', ');
       results.push({
        ruleId: this.id,
        file: ctx.file.path,
        line: m.line,
        severity: this.severity,
        message: `Identical logic detected (lines ${m.line}-${m.endLine}); also appears in ${othersFormatted}`,
        snippet: m.content.trim() + '...'
      });
    }

    return results;
  }
};

const duplicateLogicIndexCache = new WeakMap<PRDiff, Map<string, Array<{ path: string; line: number }>>>();

function buildDuplicateIndex(diff: PRDiff, MIN_LINES: number, normalize: (s: string) => string) {
  const index = new Map<string, Array<{ path: string; line: number }>>();
  for (const file of diff.files) {
    // Exclude config/lock files from duplicate checks (must match detect exclusions)
    if (/\.(json|lock|yaml|yml|toml|md|txt)$/i.test(file.path)) continue;
    if (/(package|yarn|pnpm|bun)\.lock$/i.test(file.path)) continue;

    const adds = file.additions;
    if (adds.length < MIN_LINES) continue;
    for (let i = 0; i <= adds.length - MIN_LINES; i++) {
      let isConsecutive = true;
      let content = '';
      for (let k = 0; k < MIN_LINES; k++) {
        if (k > 0 && adds[i + k].lineNumber !== adds[i + k - 1].lineNumber + 1) {
          isConsecutive = false;
          break;
        }
        content += adds[i + k].content;
      }
      if (!isConsecutive) continue;
      const trimmed = content.trim();
      if (trimmed.length < 20) continue;
      if (/^(import|export|const|let|var|package|return)/.test(trimmed)) continue;
      const sig = normalize(content);
      const arr = index.get(sig) ?? [];
      arr.push({ path: file.path, line: adds[i].lineNumber });
      index.set(sig, arr);
    }
  }
  return index;
}
