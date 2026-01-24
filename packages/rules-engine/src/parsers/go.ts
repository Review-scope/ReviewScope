export interface GoConsoleCall {
  line: number;
  type: 'fmt' | 'log';
  context: 'production' | 'test' | 'debug';
}

export interface GoTryBlock {
  tryLine: number;
  catchLine: number;
  isEmpty: boolean;
  content: string;
}

export interface GoAsyncFunction {
  line: number;
  name?: string;
  hasAwait: boolean;
}

export class GoParser {
  static findTryCatchBlocks(): GoTryBlock[] {
    return [];
  }

  static findAsyncFunctions(): GoAsyncFunction[] {
    return [];
  }

  static findConsoleCalls(source: string): GoConsoleCall[] {
    const lines = source.split('\n');
    const results: GoConsoleCall[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\bfmt\.(Println|Printf|Print)\s*\(/.test(line)) {
        results.push({
          line: i + 1,
          type: 'fmt',
          context: 'production',
        });
      } else if (/\blog\.(Println|Printf|Print|Fatal|Fatalln|Panic|Panicln)\s*\(/.test(line)) {
        results.push({
          line: i + 1,
          type: 'log',
          context: 'production',
        });
      }
    }

    return results;
  }
}

export function isGoLike(filePath: string): boolean {
  return filePath.endsWith('.go');
}
