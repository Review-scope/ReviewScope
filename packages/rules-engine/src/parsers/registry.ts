/**
 * Parser Registry
 * 
 * Provides a unified interface for parsing different file types using language-specific parsers.
 */

import { isJavaScriptLike, JavaScriptParser } from './javascript.js';
import { isPythonLike, PythonParser } from './python.js';
import { isGoLike, GoParser } from './go.js';
import { isJavaLike, JavaParser } from './java.js';
import { isCLike, CLikeParser } from './clike.js';

export class ParserRegistry {
  /**
   * Parse a file and extract AST-like information
   */
  static parse(filePath: string, content: string) {
    if (isJavaScriptLike(filePath)) {
      return {
        language: 'javascript',
        tryCatchBlocks: JavaScriptParser.findTryCatchBlocks(content),
        asyncFunctions: JavaScriptParser.findAsyncFunctions(content),
        consoleCalls: JavaScriptParser.findConsoleCalls(content),
      };
    }

    if (isPythonLike(filePath)) {
      return {
        language: 'python',
        tryCatchBlocks: PythonParser.findTryCatchBlocks(content),
        asyncFunctions: PythonParser.findAsyncFunctions(content),
        consoleCalls: PythonParser.findConsoleCalls(content),
      };
    }

    if (isGoLike(filePath)) {
      return {
        language: 'go',
        tryCatchBlocks: GoParser.findTryCatchBlocks(),
        asyncFunctions: GoParser.findAsyncFunctions(),
        consoleCalls: GoParser.findConsoleCalls(content),
      };
    }

    if (isJavaLike(filePath)) {
      return {
        language: 'java',
        tryCatchBlocks: JavaParser.findTryCatchBlocks(content),
        asyncFunctions: JavaParser.findAsyncFunctions(),
        consoleCalls: JavaParser.findConsoleCalls(content),
      };
    }

    if (isCLike(filePath)) {
      return {
        language: 'c-cpp',
        tryCatchBlocks: CLikeParser.findTryCatchBlocks(content),
        asyncFunctions: CLikeParser.findAsyncFunctions(),
        consoleCalls: CLikeParser.findConsoleCalls(content),
      };
    }

    // Unsupported language - return empty results
    return {
      language: 'unknown',
      tryCatchBlocks: [],
      asyncFunctions: [],
      consoleCalls: [],
    };
  }
}
