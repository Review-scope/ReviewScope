export interface PythonTryBlock {
  tryLine: number;
  catchLine: number;
  isEmpty: boolean;
  content: string;
}

export interface PythonAsyncFunction {
  line: number;
  name?: string;
  hasAwait: boolean;
}

export interface PythonConsoleCall {
  line: number;
  type: 'print' | 'logging';
  context: 'production' | 'test' | 'debug';
}

export class PythonParser {
  static findTryCatchBlocks(source: string): PythonTryBlock[] {
    const lines = source.split('\n');
    const results: PythonTryBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*try\s*:/.test(line)) {
        let catchLineIdx = -1;
        for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
          const candidate = lines[j];
          if (/^\s*except\b/.test(candidate)) {
            catchLineIdx = j;
            break;
          }
          if (/^\s*try\s*:/.test(candidate)) {
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

  static findAsyncFunctions(source: string): PythonAsyncFunction[] {
    const lines = source.split('\n');
    const results: PythonAsyncFunction[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*async\s+def\s+(\w+)\s*\(/.test(line)) {
        const nameMatch = line.match(/^\s*async\s+def\s+(\w+)\s*\(/);
        const name = nameMatch?.[1];
        let hasAwait = false;
        for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
          const bodyLine = lines[j];
          if (/^\s*(def|async\s+def)\s+\w+\s*\(/.test(bodyLine)) {
            break;
          }
          if (/\bawait\b/.test(bodyLine)) {
            hasAwait = true;
            break;
          }
        }
        results.push({
          line: i + 1,
          name,
          hasAwait,
        });
      }
    }

    return results;
  }

  static findConsoleCalls(source: string): PythonConsoleCall[] {
    const lines = source.split('\n');
    const results: PythonConsoleCall[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\bprint\s*\(/.test(line)) {
        results.push({
          line: i + 1,
          type: 'print',
          context: 'production',
        });
      } else if (/\blogging\.(debug|info|warning|error|critical)\s*\(/.test(line)) {
        results.push({
          line: i + 1,
          type: 'logging',
          context: 'production',
        });
      }
    }

    return results;
  }
}

export function isPythonLike(filePath: string): boolean {
  return filePath.endsWith('.py');
}

