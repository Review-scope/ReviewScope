import { loadLanguage } from './tree-sitter-utils.js';

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
  static async findTryCatchBlocks(source: string): Promise<PythonTryBlock[]> {
    try {
      const parser = await loadLanguage('python');
      const tree = parser.parse(source);
      const results: PythonTryBlock[] = [];
      const lines = source.split('\n');

      const visit = (node: any) => {
        if (node.type === 'try_statement') {
          const tryLine = node.startPosition.row + 1;
          
          for (const child of node.children) {
            if (child.type === 'except_clause') {
              const catchLine = child.startPosition.row + 1;
              let isEmpty = false;

              // Find block node inside except_clause
              const block = child.children.find((c: any) => c.type === 'block');
              if (block) {
                // Check for pass statement
                if (block.children.length === 1 && block.children[0].type === 'expression_statement') {
                   // Sometimes pass is an expression statement? No, usually pass_statement
                   if (block.children[0].children[0]?.type === 'pass') isEmpty = true; // Heuristic
                }
                if (block.children.length === 1 && block.children[0].type === 'pass_statement') {
                   isEmpty = true;
                }
                // If block is empty (rare in valid python, usually needs pass)
                if (block.children.length === 0) isEmpty = true;
              }

              results.push({
                tryLine,
                catchLine,
                isEmpty,
                content: lines[tryLine - 1]?.trim() || 'try:',
              });
            }
          }
        }
        
        for (const child of node.children) {
          visit(child);
        }
      };

      visit(tree.rootNode);
      tree.delete();
      return results;
    } catch (e) {
      console.error('Error parsing Python:', e);
      return [];
    }
  }

  static async findAsyncFunctions(source: string): Promise<PythonAsyncFunction[]> {
    try {
      const parser = await loadLanguage('python');
      const tree = parser.parse(source);
      const results: PythonAsyncFunction[] = [];

      const visit = (node: any) => {
        if (node.type === 'function_definition') {
          // Check for async keyword
          // tree-sitter-python: async_function_definition? No, it's function_definition with async keyword?
          // Actually, in newer grammars it is `function_definition` but check `node.text` starts with async?
          // Or parent is `async`?
          // Checking grammar: `async` is a modifier.
          // In some versions, `async_function_definition` exists.
          
          let isAsync = false;
          if (node.type === 'async_function_definition') { // Some versions
             isAsync = true;
          } else {
             // check children for 'async'
             if (node.children[0]?.type === 'async') isAsync = true;
          }

          if (isAsync) {
             const nameNode = node.children.find((c: any) => c.type === 'identifier');
             const name = nameNode?.text;
             const line = node.startPosition.row + 1;
             
             let hasAwait = false;
             // Traverse body for await
             const traverseBody = (n: any) => {
               if (n.type === 'await_expression') {
                 hasAwait = true;
               }
               // Don't traverse into nested functions (they have their own scope)
               if (n.type === 'function_definition' || n.type === 'async_function_definition') {
                 return; 
               }
               for (const child of n.children) traverseBody(child);
             };
             
             const body = node.children.find((c: any) => c.type === 'block');
             if (body) traverseBody(body);

             results.push({ line, name, hasAwait });
          }
        } else if (node.type === 'async_function_definition') {
           // If it is a distinct type
             const nameNode = node.children.find((c: any) => c.type === 'identifier');
             const name = nameNode?.text;
             const line = node.startPosition.row + 1;
             
             let hasAwait = false;
             const traverseBody = (n: any) => {
               if (n.type === 'await_expression') hasAwait = true;
               if (n !== node && (n.type === 'function_definition' || n.type === 'async_function_definition')) return;
               for (const child of n.children) traverseBody(child);
             };
             const body = node.children.find((c: any) => c.type === 'block');
             if (body) traverseBody(body);

             results.push({ line, name, hasAwait });
        }
        
        for (const child of node.children) {
          visit(child);
        }
      };

      visit(tree.rootNode);
      tree.delete();
      return results;
    } catch (e) {
      console.error('Error parsing Python:', e);
      return [];
    }
  }

  static async findConsoleCalls(source: string, filePath?: string): Promise<PythonConsoleCall[]> {
    try {
      const parser = await loadLanguage('python');
      const tree = parser.parse(source);
      const results: PythonConsoleCall[] = [];
      
      const context = filePath && (filePath.includes('test') || filePath.includes('spec') || filePath.includes('mock')) 
        ? 'test' 
        : 'production';

      const visit = (node: any) => {
        if (node.type === 'call_expression') {
          const func = node.children[0]; // function node
          // Check for 'print'
          if (func.type === 'identifier' && func.text === 'print') {
             results.push({
               line: node.startPosition.row + 1,
               type: 'print',
               context: context
             });
          }
          // Check for logging.xxx
          else if (func.type === 'attribute') {
             // object.attribute
             const obj = func.children[0];
             const attr = func.children[2]; // object . attribute (index 2 usually)
             if (obj.text === 'logging' && ['debug','info','warning','error','critical'].includes(attr.text)) {
                results.push({
                   line: node.startPosition.row + 1,
                   type: 'logging',
                   context: context
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
      return [];
    }
  }
}

export function isPythonLike(filePath: string): boolean {
  return filePath.endsWith('.py');
}
