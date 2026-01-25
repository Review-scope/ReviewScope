import { traverseTree, BaseTryBlock, BaseAsyncFunction, BaseConsoleCall, findStandardTryCatch } from './tree-sitter-utils.js';

export interface JavaTryBlock extends BaseTryBlock {}
export interface JavaConsoleCall extends BaseConsoleCall {
  type: 'system' | 'logger';
}
export interface JavaAsyncFunction extends BaseAsyncFunction {}

export class JavaParser {
  static async findTryCatchBlocks(source: string): Promise<JavaTryBlock[]> {
    return findStandardTryCatch<JavaTryBlock>(source, 'java', 'block');
  }

  static async findAsyncFunctions(_source: string): Promise<JavaAsyncFunction[]> {
    return []; 
  }

  static async findConsoleCalls(source: string): Promise<JavaConsoleCall[]> {
    return traverseTree<JavaConsoleCall>(source, 'java', (node, results) => {
      if (node.type === 'method_invocation') {
        if (node.text.startsWith('System.out.println') || node.text.startsWith('System.err.println')) {
            results.push({
              line: node.startPosition.row + 1,
              type: 'system',
              context: 'production'
            });
        } else if (/\blogger\.(info|debug|error|warn|trace)\s*\(/.test(node.text)) {
            results.push({
              line: node.startPosition.row + 1,
              type: 'logger',
              context: 'production'
            });
        }
      }
    });
  }
}

export function isJavaLike(filePath: string): boolean {
  return filePath.endsWith('.java');
}
