import { loadLanguage } from './tree-sitter-utils.js';

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
  static async findTryCatchBlocks(source: string): Promise<GoTryBlock[]> {
    try {
      const parser = await loadLanguage('go');
      const tree = parser.parse(source);
      const results: GoTryBlock[] = [];
      const lines = source.split('\n');

      const visit = (node: any) => {
        // In Go, try/catch is defer/recover
        // We look for calls to 'recover()'
        if (node.type === 'call_expression') {
          const func = node.children[0];
          if (func.type === 'identifier' && func.text === 'recover') {
            // Found a recover() call.
            // We consider the function wrapping it as the "catch" block equivalent
            // Usually it's inside a defer func() { if r := recover(); r != nil { ... } }()
            
            // Find the enclosing function literal
            let parent = node.parent;
            while (parent && parent.type !== 'func_literal') {
              parent = parent.parent;
            }
            
            if (parent) {
                const catchLine = parent.startPosition.row + 1;
                
                // Let's find the defer statement that wraps this func_literal
                let deferNode = parent.parent;
               // parent is func_literal. parent.parent is call_expression (invoking the func). parent.parent.parent is defer_statement
               // OR: defer funcName() -> defer_statement -> call_expression -> identifier (funcName)
               
               if (deferNode && deferNode.type === 'call_expression' && deferNode.parent && deferNode.parent.type === 'defer_statement') {
                  const deferLine = deferNode.parent.startPosition.row + 1;
                  
                  // Check if the recovery block is empty
                  // The recover() is usually in an if statement: if r := recover(); r != nil { BODY }
                  // We need to find that BODY.
                  
                  let isEmpty = false;
                  // Traverse up to find the block containing recover
                  // If recover is just called and nothing else?
                  
                  results.push({
                    tryLine: deferLine,
                    catchLine: catchLine,
                    isEmpty,
                    content: lines[deferLine - 1]?.trim() || 'defer func()',
                  });
               }
            }
          }
        }
        for (const child of node.children) visit(child);
      };

      visit(tree.rootNode);
      tree.delete();
      return results;
    } catch (e) {
      console.error('Error parsing Go:', e);
      return [];
    }
  }

  static async findAsyncFunctions(_source: string): Promise<GoAsyncFunction[]> {
    return [];
  }

  static async findConsoleCalls(source: string): Promise<GoConsoleCall[]> {
    try {
      const parser = await loadLanguage('go');
      const tree = parser.parse(source);
      const results: GoConsoleCall[] = [];

      const visit = (node: any) => {
        if (node.type === 'call_expression') {
          const func = node.children[0];
          if (func.type === 'selector_expression') {
            const operand = func.children[0];
            const selector = func.children[2];
            
            if (operand.text === 'fmt' && selector.text.startsWith('Print')) {
               results.push({
                 line: node.startPosition.row + 1,
                 type: 'fmt',
                 context: 'production'
               });
            } else if (operand.text === 'log' && (selector.text.startsWith('Print') || selector.text.startsWith('Fatal') || selector.text.startsWith('Panic'))) {
               results.push({
                 line: node.startPosition.row + 1,
                 type: 'log',
                 context: 'production'
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
      console.error('Error parsing Go:', e);
      return [];
    }
  }
}

export function isGoLike(filePath: string): boolean {
  return filePath.endsWith('.go');
}
