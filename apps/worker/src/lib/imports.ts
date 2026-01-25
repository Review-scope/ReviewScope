import path from 'path';

export interface ImportDefinition {
  module: string;
  imports: string[]; // named imports or default
  isType: boolean;
  line: number;
}

export function detectLanguage(filePath: string): string {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.go')) return 'go';
  if (filePath.endsWith('.java')) return 'java';
  if (filePath.endsWith('.c') || filePath.endsWith('.cpp') || filePath.endsWith('.h') || filePath.endsWith('.hpp')) return 'cpp';
  return 'unknown';
}

// --- JavaScript / TypeScript ---

// Regex for ES6 imports
// Matches: import { Foo } from './bar'; import Foo from './bar'; import * as Bar from './bar';
const JS_IMPORT_REGEX = /import\s+(?:type\s+)?(?:(\w+)|\{\s*([\w\s,]+)\s*\}|\*\s+as\s+(\w+))?\s*(?:from\s+)?['"]([^'"]+)['"]/g;
// Regex for CJS require
// Matches: const Foo = require('./bar'); const { Foo } = require('./bar');
const JS_REQUIRE_REGEX = /(?:const|let|var)\s+(?:(\w+)|\{\s*([\w\s,]+)\s*\})\s*=\s*require\(['"]([^'"]+)['"]\)/g;
// Regex for dynamic imports
const DYNAMIC_IMPORT_REGEX = /import\(['"]([^'"]+)['"]\)/g;

function extractJsImports(content: string): ImportDefinition[] {
  const imports: ImportDefinition[] = [];
  
  // ES6 Imports
  let match;
  while ((match = JS_IMPORT_REGEX.exec(content)) !== null) {
    const defaultImport = match[1];
    const namedImports = match[2];
    const namespaceImport = match[3];
    const modulePath = match[4];
    
    // Skip if no module path (shouldn't happen with regex but safe)
    if (!modulePath) continue;

    const importedItems: string[] = [];
    if (defaultImport) importedItems.push(defaultImport);
    if (namespaceImport) importedItems.push(namespaceImport);
    if (namedImports) {
      importedItems.push(...namedImports.split(',').map(s => s.trim()).filter(Boolean));
    }
    
    imports.push({
      module: modulePath,
      imports: importedItems,
      isType: match[0].includes('import type'),
      line: 0 // Line number calculation skipped for performance
    });
  }

  // CommonJS Requires
  while ((match = JS_REQUIRE_REGEX.exec(content)) !== null) {
    const defaultImport = match[1];
    const namedImports = match[2];
    const modulePath = match[3];

    if (!modulePath) continue;

    const importedItems: string[] = [];
    if (defaultImport) importedItems.push(defaultImport);
    if (namedImports) {
      importedItems.push(...namedImports.split(',').map(s => s.trim()).filter(Boolean));
    }

    imports.push({
      module: modulePath,
      imports: importedItems,
      isType: false,
      line: 0
    });
  }

  // Dynamic Imports
  while ((match = DYNAMIC_IMPORT_REGEX.exec(content)) !== null) {
    const modulePath = match[1];
    if (modulePath) {
      imports.push({
        module: modulePath,
        imports: [],
        isType: false,
        line: 0
      });
    }
  }

  return imports;
}

// --- Python ---

function extractPythonImports(content: string): ImportDefinition[] {
  const imports: ImportDefinition[] = [];
  
  // from x import y
  const fromRegex = /^from\s+([a-zA-Z0-9_.]+)\s+import\s+([a-zA-Z0-9_.,\s]+)/gm;
  let match;
  while ((match = fromRegex.exec(content)) !== null) {
    const modulePath = match[1];
    const importedItems = match[2].split(',').map(s => s.trim()).filter(Boolean);
    imports.push({
      module: modulePath,
      imports: importedItems,
      isType: false,
      line: 0
    });
  }

  // import x
  const importRegex = /^import\s+([a-zA-Z0-9_.,\s]+)/gm;
  while ((match = importRegex.exec(content)) !== null) {
    const modules = match[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const mod of modules) {
      imports.push({
        module: mod,
        imports: [],
        isType: false,
        line: 0
      });
    }
  }

  return imports;
}

// --- Go ---

function extractGoImports(content: string): ImportDefinition[] {
  const imports: ImportDefinition[] = [];

  // Block imports
  const blockMatch = content.match(/import\s*\(([\s\S]*?)\)/);
  if (blockMatch) {
    const lines = blockMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/"(.+?)"/);
      if (match) {
        imports.push({
          module: match[1],
          imports: [],
          isType: false,
          line: 0
        });
      }
    }
  }

  // Single imports
  const singleImportRegex = /import\s+"(.+?)"/g;
  let match;
  while ((match = singleImportRegex.exec(content)) !== null) {
    imports.push({
      module: match[1],
      imports: [],
      isType: false,
      line: 0
    });
  }

  return imports;
}

// --- Java ---

function extractJavaImports(content: string): ImportDefinition[] {
  const imports: ImportDefinition[] = [];
  const regex = /^import\s+([\w.]+);/gm;

  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push({
      module: match[1],
      imports: [],
      isType: false,
      line: 0
    });
  }

  return imports;
}

// --- C / C++ ---

function extractCppImports(content: string): ImportDefinition[] {
  const imports: ImportDefinition[] = [];
  const regex = /#include\s+[<"](.+?)[">]/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push({
      module: match[1],
      imports: [],
      isType: false,
      line: 0
    });
  }

  return imports;
}

export function extractImports(content: string, filePath: string = 'unknown.ts'): ImportDefinition[] {
  const lang = detectLanguage(filePath);

  switch (lang) {
    case 'typescript':
    case 'javascript':
      return extractJsImports(content);
    case 'python':
      return extractPythonImports(content);
    case 'go':
      return extractGoImports(content);
    case 'java':
      return extractJavaImports(content);
    case 'cpp':
      return extractCppImports(content);
    default:
      // Fallback: try JS extraction if unknown
      return extractJsImports(content);
  }
}

export function resolveImportPath(currentFilePath: string, importPath: string): string | null {
  if (importPath.startsWith('.')) {
    // Resolve relative path using posix to force forward slashes
    const dir = path.posix.dirname(currentFilePath);
    let resolved = path.posix.join(dir, importPath);
    
    // Normalize (remove ./ and ../)
    resolved = path.posix.normalize(resolved);
    
    return resolved;
  }
  return null; // Ignore node_modules for now
}

/**
 * Extracts a summary of the file content for context.
 * Focuses on exported members, types, and interfaces.
 */
export function extractContextSummary(content: string): string {
  const lines = content.split('\n');
  
  // Heuristic: Keep lines that look like definitions
  // - export ...
  // - interface ...
  // - type ...
  // - class ...
  // - function ...
  // - JSDoc comments /** ... */
  
  // Also keep the first 10 lines (imports/setup)
  const header = lines.slice(0, 10).join('\n');
  
  const body = lines.filter((line, index) => {
      if (index < 10) return false; // Already in header
      const trimmed = line.trim();
      return (
          trimmed.startsWith('export') ||
          trimmed.startsWith('interface') ||
          trimmed.startsWith('type') ||
          trimmed.startsWith('class') ||
          trimmed.startsWith('function') ||
          trimmed.startsWith('/**') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('//') // comments might be useful
      );
  });

  // If body is too small, maybe we filtered too aggressively (e.g. non-exported stuff used internally)
  // Let's fallback to "first 100 lines" if the filtered content is sparse
  if (body.length < 5 && lines.length > 20) {
      return lines.slice(0, 100).join('\n') + (lines.length > 100 ? '\n... (truncated)' : '');
  }

  // Limit total size to avoid exploding context
  const MAX_LINES = 200;
  if (body.length > MAX_LINES) {
      return header + '\n...\n' + body.slice(0, MAX_LINES).join('\n') + '\n... (truncated)';
  }

  return header + '\n...\n' + body.join('\n');
}