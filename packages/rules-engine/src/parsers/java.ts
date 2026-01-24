export interface JavaTryBlock {
  tryLine: number;
  catchLine: number;
  isEmpty: boolean;
  content: string;
}

export interface JavaConsoleCall {
  line: number;
  type: 'system' | 'logger';
  context: 'production' | 'test' | 'debug';
}

export interface JavaAsyncFunction {
  line: number;
  name?: string;
  hasAwait: boolean;
}

export class JavaParser {
  static findTryCatchBlocks(source: string): JavaTryBlock[] {
    const lines = source.split('\n');
    const results: JavaTryBlock[] = [];

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

  static findAsyncFunctions(): JavaAsyncFunction[] {
    return [];
  }

  static findConsoleCalls(source: string): JavaConsoleCall[] {
    const lines = source.split('\n');
    const results: JavaConsoleCall[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\bSystem\.out\.println\s*\(/.test(line) || /\bSystem\.err\.println\s*\(/.test(line)) {
        results.push({
          line: i + 1,
          type: 'system',
          context: 'production',
        });
      } else if (/\blogger\.(info|debug|error|warn|trace)\s*\(/i.test(line)) {
        results.push({
          line: i + 1,
          type: 'logger',
          context: 'production',
        });
      }
    }

    return results;
  }
}

export function isJavaLike(filePath: string): boolean {
  return filePath.endsWith('.java');
}
