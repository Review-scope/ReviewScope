import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Parser = require('web-tree-sitter');

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initialized = false;
const languages: Record<string, any> = {};

export async function initTreeSitter() {
  if (!initialized) {
    await Parser.init();
    initialized = true;
  }
}

function resolveWasmPath(lang: string): string {
  const candidates = [
    path.join(__dirname, `tree-sitter-${lang}.wasm`),
    path.join(__dirname, 'wasms', `tree-sitter-${lang}.wasm`),
    path.join(process.cwd(), `tree-sitter-${lang}.wasm`),
    path.join(process.cwd(), 'public', `tree-sitter-${lang}.wasm`),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    `tree-sitter-${lang}.wasm not found. Expected in src/parsers or /public`
  );
}

export async function loadLanguage(lang: string) {
  await initTreeSitter();

  if (!languages[lang]) {
    const wasmPath = resolveWasmPath(lang);
    languages[lang] = await Parser.Language.load(wasmPath);
  }

  const parser = new Parser();
  parser.setLanguage(languages[lang]);

  return parser;
}

export interface BaseTryBlock {
  tryLine: number;
  catchLine: number;
  isEmpty: boolean;
  content: string;
}

export interface BaseAsyncFunction {
  line: number;
  name?: string;
  hasAwait: boolean;
}

export interface BaseConsoleCall {
  line: number;
  type: string;
  context: 'production' | 'test' | 'debug';
}

export async function traverseTree<T>(
  source: string,
  language: string,
  visitor: (node: any, results: T[]) => void
): Promise<T[]> {
  const results: T[] = [];
  try {
    const parser = await loadLanguage(language);
    const tree = parser.parse(source);

    const visit = (node: any) => {
      visitor(node, results);
      if (node.children) {
        for (const child of node.children) {
          visit(child);
        }
      }
    };

    visit(tree.rootNode);
    tree.delete();
  } catch (e) {
    console.error(`Error parsing ${language}:`, e);
  }
  return results;
}

export function isBlockEmpty(node: any, ignoredTypes: string[] = ['{', '}', 'comment']): boolean {
  if (!node) return true;
  const relevantChildren = node.children.filter((c: any) => !ignoredTypes.includes(c.type));
  return relevantChildren.length === 0;
}

export async function findStandardTryCatch<T extends BaseTryBlock>(
  source: string,
  language: string,
  blockType: string = 'block'
): Promise<T[]> {
  const lines = source.split('\n');
  return traverseTree<T>(source, language, (node, results) => {
    if (node.type === 'try_statement') {
      const tryLine = node.startPosition.row + 1;
      
      for (const child of node.children) {
        if (child.type === 'catch_clause') {
            const catchLine = child.startPosition.row + 1;
            let isEmpty = false;
            
            const block = child.children.find((c: any) => c.type === blockType);
            if (block) {
              isEmpty = isBlockEmpty(block);
            }
            
            results.push({
              tryLine,
              catchLine,
              isEmpty,
              content: lines[tryLine-1]?.trim() || 'try'
            } as T);
        }
      }
    }
  });
}