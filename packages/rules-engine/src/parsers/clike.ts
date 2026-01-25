import { traverseTree, BaseTryBlock, BaseAsyncFunction, BaseConsoleCall, findStandardTryCatch } from './tree-sitter-utils.js';

export interface CLikeTryBlock extends BaseTryBlock {}

export interface CLikeConsoleCall extends BaseConsoleCall {
  type: 'printf' | 'iostream';
}

export interface CLikeAsyncFunction extends BaseAsyncFunction {}

export class CLikeParser {
  static async findTryCatchBlocks(source: string): Promise<CLikeTryBlock[]> {
    return findStandardTryCatch<CLikeTryBlock>(source, 'cpp', 'compound_statement');
  }

  static async findAsyncFunctions(_source: string): Promise<CLikeAsyncFunction[]> {
    return [];
  }

  static async findConsoleCalls(source: string): Promise<CLikeConsoleCall[]> {
    return traverseTree<CLikeConsoleCall>(source, 'cpp', (node, results) => {
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
    });
  }
}

export function isCLike(filePath: string): boolean {
  return /\.(c|cc|cpp|cxx|hpp|hh|h)$/.test(filePath);
}
