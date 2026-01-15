/**
 * AST Parser for JavaScript/TypeScript
 * 
 * Provides utilities for parsing and analyzing JS/TS code using a simple regex-based approach
 * that simulates AST walking without external parser dependencies.
 * 
 * For production, consider upgrading to:
 * - @babel/parser + @babel/traverse (full AST)
 * - typescript compiler API (precise source locations)
 * - @swc/core (fastest parsing)
 */

export interface ASTNode {
  type: 'TryStatement' | 'CatchClause' | 'BlockStatement' | 'CallExpression' | 'AwaitExpression' | 'FunctionDeclaration' | 'FunctionExpression' | 'ArrowFunctionExpression';
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
  }> {
    const lines = source.split('\n');
    const results: Array<{
      tryLine: number;
      catchLine: number;
      isEmpty: boolean;
      content: string;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for try keyword (not in string/comment)
      if (this.isTryStatement(line)) {
        // Find matching catch block
        let catchLineIdx = i + 1;
        let braceDepth = 0;
        let inTryBlock = false;

        // Find end of try block
        for (let j = i; j < lines.length && catchLineIdx < lines.length + 10; j++) {
          const currentLine = lines[j];
          braceDepth += (currentLine.match(/{/g) || []).length;
          braceDepth -= (currentLine.match(/}/g) || []).length;

          if (braceDepth === 0 && j > i && inTryBlock) {
            // End of try block found, look for catch
            for (let k = j; k < Math.min(j + 5, lines.length); k++) {
              if (this.isCatchStatement(lines[k])) {
                catchLineIdx = k;
                break;
              }
            }
            break;
          }

          if (braceDepth > 0) {
            inTryBlock = true;
          }
        }

        // Check if catch block is empty
        if (catchLineIdx < lines.length) {
          const catchContent = this.extractBlockContent(lines, catchLineIdx);
          const isEmpty = catchContent.trim().length === 0 || this.isEmptyBlock(catchContent);

          results.push({
            tryLine: i + 1,
            catchLine: catchLineIdx + 1,
            isEmpty,
            content: line.trim(),
          });
        }
      }
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
    const lines = source.split('\n');
    const results: Array<{
      line: number;
      name?: string;
      hasAwait: boolean;
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (this.isAsyncFunction(line)) {
        // Extract function name if available
        const nameMatch = line.match(/async\s+(\w+)/);
        const name = nameMatch?.[1];

        // Check if this async function has await
        let hasAwait = false;
        for (let j = i; j < Math.min(i + 20, lines.length); j++) {
          if (lines[j].includes('await')) {
            hasAwait = true;
            break;
          }
          // Stop if we hit the next function
          if (j > i && this.isFunctionDeclaration(lines[j])) {
            break;
          }
        }

        results.push({
          line: i + 1,
          name,
          hasAwait,
        });
      }
    }

    return results;
  }

  /**
   * Find all console.log/debug/error calls
   */
  static findConsoleCalls(source: string): Array<{
    line: number;
    type: 'log' | 'debug' | 'error' | 'warn';
    context: 'production' | 'test' | 'debug';
  }> {
    const lines = source.split('\n');
    const results: Array<{
      line: number;
      type: 'log' | 'debug' | 'error' | 'warn';
      context: 'production' | 'test' | 'debug';
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match console.log/debug/error/warn
      const consoleMatch = line.match(/console\.(log|debug|error|warn)\s*\(/);
      if (consoleMatch) {
        const type = consoleMatch[1] as 'log' | 'debug' | 'error' | 'warn';
        
        // Determine context (test, debug function, or production)
        const context = this.inferConsoleContext(lines, i);

        results.push({
          line: i + 1,
          type,
          context,
        });
      }
    }

    return results;
  }

  /**
   * Infer whether a console call is in test code, debug function, or production
   */
  private static inferConsoleContext(
    lines: string[],
    lineIdx: number
  ): 'production' | 'test' | 'debug' {
    // Look back up to 10 lines for context clues
    const contextLines = lines.slice(Math.max(0, lineIdx - 10), lineIdx).join('\n');

    // Test context indicators
    if (
      /\b(describe|it|test|beforeEach|afterEach|expect)\s*\(/.test(contextLines) ||
      /\.test\.ts|\.spec\.ts|__tests__|\.test\.js/.test(lines[lineIdx])
    ) {
      return 'test';
    }

    // Debug context indicators
    if (
      /function\s+(debug|log|trace|print|log|debug)/.test(contextLines) ||
      /const\s+(debug|log|trace|print)\s*=/.test(contextLines)
    ) {
      return 'debug';
    }

    return 'production';
  }

  // ============ Helper Methods ============

  private static isTryStatement(line: string): boolean {
    // Simple check: line contains 'try' keyword not in string/comment
    return /\btry\s*{/.test(this.removeStringsAndComments(line));
  }

  private static isCatchStatement(line: string): boolean {
    return /\bcatch\s*\(/.test(this.removeStringsAndComments(line));
  }

  private static isAsyncFunction(line: string): boolean {
    return /\basync\s+(function|\w+|=>)/.test(this.removeStringsAndComments(line));
  }

  private static isFunctionDeclaration(line: string): boolean {
    return /\b(function|const|let|var)\s+\w+\s*[=\(]/.test(this.removeStringsAndComments(line));
  }

  private static isEmptyBlock(content: string): boolean {
    const trimmed = content.trim();
    return trimmed === '{}' || trimmed === '';
  }

  private static extractBlockContent(lines: string[], startIdx: number): string {
    // Extract content of a block starting from the catch/try line
    let braceDepth = 0;
    let inBlock = false;
    let content = '';

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];

      for (const char of line) {
        if (char === '{') {
          braceDepth++;
          inBlock = true;
        } else if (char === '}') {
          braceDepth--;
          if (braceDepth === 0 && inBlock) {
            return content;
          }
        } else if (inBlock) {
          content += char;
        }
      }

      if (inBlock) {
        content += '\n';
      }
    }

    return content;
  }

  private static removeStringsAndComments(line: string): string {
    // Remove single-line comments
    let result = line.split('//')[0];

    // Remove strings (basic approach - may have edge cases)
    result = result.replace(/"[^"]*"/g, '""');
    result = result.replace(/'[^']*'/g, "''");
    result = result.replace(/`[^`]*`/g, '``');

    return result;
  }
}

/**
 * Determine if a file is JavaScript/TypeScript
 */
export function isJavaScriptLike(filePath: string): boolean {
  return /\.(js|ts|jsx|tsx)$/.test(filePath);
}

/**
 * Extract language from file extension
 */
export function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop() || 'unknown';
  return ext === 'js' ? 'javascript' :
         ext === 'ts' ? 'typescript' :
         ext === 'jsx' ? 'jsx' :
         ext === 'tsx' ? 'tsx' :
         'unknown';
}
