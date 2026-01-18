export interface GoConsoleCall {
  line: number;
  type: 'fmt' | 'log';
  context: 'production' | 'test' | 'debug';
}

export class GoParser {
  static findTryCatchBlocks(): any[] {
    return [];
  }

  static findAsyncFunctions(): any[] {
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
