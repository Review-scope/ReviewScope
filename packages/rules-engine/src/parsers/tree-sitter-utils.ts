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