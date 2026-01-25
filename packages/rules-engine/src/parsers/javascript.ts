import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

// Workaround for import issues with @babel/traverse
const traverse = (_traverse as any).default || _traverse;

/**
 * AST Parser for JavaScript/TypeScript using Babel
 */

export interface ASTNode {
  type: string;
  start: number;
  end: number;
  startLine: number;
  endLine: number;
  content: string;
  children?: ASTNode[];
  parent?: ASTNode;
}

export class JavaScriptParser {
  /**
   * Find all try-catch statements in source code
   * Returns line numbers where try/catch blocks are found
   */
  static findTryCatchBlocks(source: string): Array<{
    tryLine: number;
    catchLine: number;
    isEmpty: boolean;
    content: string;
    tryStart?: number;
    tryEnd?: number;
    catchStart?: number;
    catchEnd?: number;
  }> {
    const results: Array<{
      tryLine: number;
      catchLine: number;
      isEmpty: boolean;
      content: string;
      tryStart?: number;
      tryEnd?: number;
      catchStart?: number;
      catchEnd?: number;
    }> = [];

    try {
      const ast = parse(source, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties'],
        errorRecovery: true, // Be tolerant of errors
      });

      traverse(ast, {
        TryStatement(path: NodePath<t.TryStatement>) {
          const { node } = path;
          const tryLine = node.loc?.start.line || 0;
          const tryStart = node.block?.loc?.start.line || tryLine;
          const tryEnd = node.block?.loc?.end.line || tryLine;
          
          if (node.handler) {
            const catchClause = node.handler;
            const catchLine = catchClause.loc?.start.line || 0;
            const catchStart = catchClause.body?.loc?.start.line || catchLine;
            const catchEnd = catchClause.body?.loc?.end.line || catchLine;
            
            // Check if catch block is empty or only contains comments
            // Note: Babel AST doesn't strictly include comments in body by default in a way that's easy to check for "empty but comments",
            // but empty body is usually body.body.length === 0.
            const body = catchClause.body.body;
            const isEmpty = body.length === 0;

            // Get content of the try block line for context
            const lines = source.split('\n');
            const content = lines[tryLine - 1] || '';

            results.push({
              tryLine,
              catchLine,
              isEmpty,
              content: content.trim(),
              tryStart,
              tryEnd,
              catchStart,
              catchEnd,
            });
          }
        }
      });
    } catch (e) {
      console.error('Error parsing JavaScript/TypeScript source:', e);
      // Fallback or just return what we have
    }

    return results;
  }

  /**
   * Find all async functions (which may have unhandled promise rejections)
   */
  static findAsyncFunctions(source: string): Array<{
    line: number;
    name?: string;
    hasAwait: boolean;
  }> {
    const results: Array<{
      line: number;
      name?: string;
      hasAwait: boolean;
    }> = [];

    try {
      const ast = parse(source, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties'],
        errorRecovery: true,
      });

      traverse(ast, {
        Function(path: NodePath<t.Function>) {
          if (path.node.async) {
            // Check for await
            let hasAwait = false;
            path.traverse({
              AwaitExpression() {
                hasAwait = true;
              }
            });

            const line = path.node.loc?.start.line || 0;
            const id = (path.node as any).id;
            const name = id ? id.name : 'anonymous';

            results.push({
              line,
              name,
              hasAwait,
            });
          }
        }
      });
    } catch (e) {
      // Ignore errors
    }

    return results;
  }

  /**
   * Find all console.* calls
   */
  static findConsoleCalls(source: string): Array<{
    line: number;
    type: string;
    content: string;
  }> {
    const results: Array<{
      line: number;
      type: string;
      content: string;
    }> = [];

    try {
      const ast = parse(source, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties'],
        errorRecovery: true,
      });

      traverse(ast, {
        CallExpression(path: NodePath<t.CallExpression>) {
          const { node } = path;
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'console' &&
            node.callee.property.type === 'Identifier'
          ) {
            const type = node.callee.property.name;
            const line = node.loc?.start.line || 0;
            
            // Get content
            const lines = source.split('\n');
            const content = lines[line - 1] || '';

            results.push({
              line,
              type,
              content: content.trim(),
            });
          }
        }
      });
    } catch (e) {
      // Ignore errors
    }

    return results;
  }
}

export function isJavaScriptLike(filePath: string): boolean {
  return /\.(js|jsx|ts|tsx)$/.test(filePath);
}
