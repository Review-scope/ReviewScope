import { loadLanguage } from './tree-sitter-utils.js';

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
  static async findTryCatchBlocks(source: string): Promise<JavaTryBlock[]> {
    try {
      const parser = await loadLanguage('java');
      const tree = parser.parse(source);
      const results: JavaTryBlock[] = [];
      const lines = source.split('\n');

      const visit = (node: any) => {
        if (node.type === 'try_statement') {
          const tryLine = node.startPosition.row + 1;
          
          for (const child of node.children) {
            if (child.type === 'catch_clause') {
               const catchLine = child.startPosition.row + 1;
               let isEmpty = false;
               
               const block = child.children.find((c: any) => c.type === 'block');
               if (block) {
                 // Check if block contains only braces
                 const relevantChildren = block.children.filter((c: any) => c.type !== '{' && c.type !== '}' && c.type !== 'comment');
                 if (relevantChildren.length === 0) isEmpty = true;
               }
               
               results.push({
                 tryLine,
                 catchLine,
                 isEmpty,
                 content: lines[tryLine-1]?.trim() || 'try'
               });
            }
          }
        }
        for (const child of node.children) visit(child);
      };

      visit(tree.rootNode);
      tree.delete();
      return results;
    } catch (e) {
      console.error('Error parsing Java:', e);
      return [];
    }
  }

  static async findAsyncFunctions(_source: string): Promise<JavaAsyncFunction[]> {
    return []; 
  }

  static async findConsoleCalls(source: string): Promise<JavaConsoleCall[]> {
    try {
      const parser = await loadLanguage('java');
      const tree = parser.parse(source);
      const results: JavaConsoleCall[] = [];

      const visit = (node: any) => {
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
        for (const child of node.children) visit(child);
      };

      visit(tree.rootNode);
      tree.delete();
      return results;
    } catch (e) {
      console.error('Error parsing Java:', e);
      return [];
    }
  }
}

export function isJavaLike(filePath: string): boolean {
  return filePath.endsWith('.java');
}
