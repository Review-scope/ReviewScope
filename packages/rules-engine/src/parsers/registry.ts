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
  static async parse(filePath: string, content: string) {
    if (isJavaScriptLike(filePath)) {
      return {
        language: 'javascript',
        tryCatchBlocks: JavaScriptParser.findTryCatchBlocks(content),
        asyncFunctions: JavaScriptParser.findAsyncFunctions(content),
        consoleCalls: JavaScriptParser.findConsoleCalls(content, filePath),
      };
    }

    if (isPythonLike(filePath)) {
      return {
        language: 'python',
        tryCatchBlocks: await PythonParser.findTryCatchBlocks(content),
        asyncFunctions: await PythonParser.findAsyncFunctions(content),
        consoleCalls: await PythonParser.findConsoleCalls(content, filePath),
      };
    }

    if (isGoLike(filePath)) {
      return {
        language: 'go',
        tryCatchBlocks: await GoParser.findTryCatchBlocks(content),
        asyncFunctions: await GoParser.findAsyncFunctions(content),
        consoleCalls: await GoParser.findConsoleCalls(content),
      };
    }

    if (isJavaLike(filePath)) {
      return {
        language: 'java',
        tryCatchBlocks: await JavaParser.findTryCatchBlocks(content),
        asyncFunctions: await JavaParser.findAsyncFunctions(content),
        consoleCalls: await JavaParser.findConsoleCalls(content),
      };
    }

    if (isCLike(filePath)) {
      return {
        language: 'c-cpp',
        tryCatchBlocks: await CLikeParser.findTryCatchBlocks(content),
        asyncFunctions: await CLikeParser.findAsyncFunctions(content),
        consoleCalls: await CLikeParser.findConsoleCalls(content),
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
