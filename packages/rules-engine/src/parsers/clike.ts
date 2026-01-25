import { loadLanguage } from './tree-sitter-utils.js';

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
  static async findTryCatchBlocks(source: string): Promise<CLikeTryBlock[]> {
    try {
      const parser = await loadLanguage('cpp'); 
      const tree = parser.parse(source);
      const results: CLikeTryBlock[] = [];
      const lines = source.split('\n');

      const visit = (node: any) => {
        if (node.type === 'try_statement') {
          const tryLine = node.startPosition.row + 1;
          
          for (const child of node.children) {
            if (child.type === 'catch_clause') {
               const catchLine = child.startPosition.row + 1;
               let isEmpty = false;
               
               const block = child.children.find((c: any) => c.type === 'compound_statement');
               if (block) {
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
      console.error('Error parsing C/C++:', e);
      return [];
    }
  }

  static async findAsyncFunctions(_source: string): Promise<CLikeAsyncFunction[]> {
    return [];
  }

  static async findConsoleCalls(source: string): Promise<CLikeConsoleCall[]> {
    try {
      const parser = await loadLanguage('cpp');
      const tree = parser.parse(source);
      const results: CLikeConsoleCall[] = [];

      const visit = (node: any) => {
        if (node.type === 'call_expression') {
          const func = node.children[0];
          if (func.text === 'printf') {
             results.push({
               line: node.startPosition.row + 1,
               type: 'printf',
               context: 'production'
             });
          }
        }
        
        if ((node.type === 'qualified_identifier' || node.type === 'identifier') && 
            (node.text === 'std::cout' || node.text === 'std::cerr' || node.text === 'cout' || node.text === 'cerr')) {
           let p = node.parent;
           // Check if it's being shifted to
           // This is a rough check, as tree structure can vary
           if (p && (p.type === 'shift_expression' || p.parent?.type === 'shift_expression')) {
              results.push({
                line: node.startPosition.row + 1,
                type: 'iostream',
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
      console.error('Error parsing C/C++:', e);
      return [];
    }
  }
}

export function isCLike(filePath: string): boolean {
  return /\.(c|cc|cpp|cxx|hpp|hh|h)$/.test(filePath);
}
