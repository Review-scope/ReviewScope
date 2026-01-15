/**
 * Parser Registry
 * 
 * Provides a unified interface for parsing different file types using language-specific parsers.
 */

import { isJavaScriptLike, JavaScriptParser } from './javascript.js';

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

    // Unsupported language - return empty results
    return {
      language: 'unknown',
      tryCatchBlocks: [],
      asyncFunctions: [],
      consoleCalls: [],
    };
  }
}
