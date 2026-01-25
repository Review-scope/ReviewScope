import { traverseTree, BaseTryBlock, BaseAsyncFunction, BaseConsoleCall } from './tree-sitter-utils.js';

export interface PythonTryBlock extends BaseTryBlock {}

export interface PythonAsyncFunction extends BaseAsyncFunction {}

export interface PythonConsoleCall extends BaseConsoleCall {
  type: 'print' | 'logging';
}

export class PythonParser {
  static async findTryCatchBlocks(source: string): Promise<PythonTryBlock[]> {
    const lines = source.split('\n');
    return traverseTree<PythonTryBlock>(source, 'python', (node, results) => {
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
    });
  }

  static async findAsyncFunctions(source: string): Promise<PythonAsyncFunction[]> {
    return traverseTree<PythonAsyncFunction>(source, 'python', (node, results) => {
      if (node.type === 'function_definition' || node.type === 'async_function_definition') {
        let isAsync = false;
        if (node.type === 'async_function_definition') {
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
              if (n !== node && (n.type === 'function_definition' || n.type === 'async_function_definition')) {
                return; 
              }
              for (const child of n.children) traverseBody(child);
            };
            
            const body = node.children.find((c: any) => c.type === 'block');
            if (body) traverseBody(body);

            results.push({ line, name, hasAwait });
        }
      }
    });
  }

  static async findConsoleCalls(source: string, filePath?: string): Promise<PythonConsoleCall[]> {
    const context = filePath && (filePath.includes('test') || filePath.includes('spec') || filePath.includes('mock')) 
      ? 'test' 
      : 'production';

    return traverseTree<PythonConsoleCall>(source, 'python', (node, results) => {
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
    });
  }
}

export function isPythonLike(filePath: string): boolean {
  return filePath.endsWith('.py');
}
