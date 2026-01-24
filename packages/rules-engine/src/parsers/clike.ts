export interface CLikeTryBlock {
  tryLine: number;
  catchLine: number;
  isEmpty: boolean;
  content: string;
}

export interface CLikeConsoleCall {
  line: number;
  type: 'printf' | 'iostream';
  context: 'production' | 'test' | 'debug';
}

export interface CLikeAsyncFunction {
  line: number;
  name?: string;
  hasAwait: boolean;
}

export class CLikeParser {
  static findTryCatchBlocks(source: string): CLikeTryBlock[] {
    const lines = source.split('\n');
    const results: CLikeTryBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\btry\s*\{/.test(line)) {
        let catchLineIdx = -1;
        let braceDepth = 0;
        let inTryBlock = false;

        for (let j = i; j < lines.length; j++) {
          const current = lines[j];
          braceDepth += (current.match(/{/g) || []).length;
          braceDepth -= (current.match(/}/g) || []).length;
          if (braceDepth > 0) {
            inTryBlock = true;
          }
          if (braceDepth === 0 && inTryBlock && j > i) {
            for (let k = j; k < Math.min(j + 10, lines.length); k++) {
              if (/\bcatch\s*\(/.test(lines[k])) {
                catchLineIdx = k;
                break;
              }
            }
            break;
          }
        }

        if (catchLineIdx !== -1) {
          results.push({
            tryLine: i + 1,
            catchLine: catchLineIdx + 1,
            isEmpty: false,
            content: line.trim(),
          });
        }
      }
    }

    return results;
  }

  static findAsyncFunctions(): CLikeAsyncFunction[] {
    return [];
  }

  static findConsoleCalls(source: string): CLikeConsoleCall[] {
    const lines = source.split('\n');
    const results: CLikeConsoleCall[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\bprintf\s*\(/.test(line)) {
        results.push({
          line: i + 1,
          type: 'printf',
          context: 'production',
        });
      } else if (/\bstd::(cout|cerr)\s*<</.test(line)) {
        results.push({
          line: i + 1,
          type: 'iostream',
          context: 'production',
        });
      }
    }

    return results;
  }
}

export function isCLike(filePath: string): boolean {
  return /\.(c|cc|cpp|cxx|hpp|hh|h)$/.test(filePath);
}
