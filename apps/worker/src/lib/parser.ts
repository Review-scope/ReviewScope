import { DiffFile } from '@reviewscope/rules-engine';

export interface ParsedFile extends DiffFile {
  hunks: Array<{
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
  }>;
}

export type { DiffFile };

export function parseDiff(diff: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const lines = diff.split('\n');
  let currentFile: ParsedFile | null = null;
  let currentOldLine = 0;
  let currentNewLine = 0;

  // Regex to parse hunk headers: @@ -oldStart,oldLen +newStart,newLen @@
  const hunkHeaderRegex = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
  
  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      if (currentFile) files.push(currentFile);
      
      const match = line.match(/a\/(.*) b\/(.*)$/);
      currentFile = {
        path: match ? match[2] : 'unknown',
        additions: [],
        deletions: [],
        hunks: [],
      };
      
      // Reset line counters for the new file
      currentOldLine = 0;
      currentNewLine = 0;
    } else if (!currentFile) {
      continue;
    } else if (line.startsWith('@@')) {
      const match = line.match(hunkHeaderRegex);
      if (match) {
        currentOldLine = parseInt(match[1], 10);
        const oldLines = match[2] ? parseInt(match[2], 10) : 1;
        currentNewLine = parseInt(match[3], 10);
        const newLines = match[4] ? parseInt(match[4], 10) : 1;
        
        currentFile.hunks.push({
          oldStart: currentOldLine,
          oldLines,
          newStart: currentNewLine,
          newLines
        });
      }
    } else {
      // Check for content lines
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentFile.additions.push({
          lineNumber: currentNewLine,
          content: line.substring(1), // remove '+'
        });
        currentNewLine++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentFile.deletions.push({
          lineNumber: currentOldLine,
          content: line.substring(1), // remove '-'
        });
        currentOldLine++;
      } else if (line.startsWith(' ')) {
        // Context line
        currentOldLine++;
        currentNewLine++;
      }
      // Ignore other metadata lines like 'index', 'new file mode', '+++', '---'
    }
  }

  if (currentFile) files.push(currentFile);
  return files;
}

export function detectDuplicateKeys(file: ParsedFile): Array<{ key: string; lines: number[] }> {
  const keyMap = new Map<string, number[]>();

  for (const add of file.additions) {
    const match = add.content.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
    if (!match) continue;

    const key = match[1];
    if (!key) continue;

    const list = keyMap.get(key);
    if (list) {
      list.push(add.lineNumber);
    } else {
      keyMap.set(key, [add.lineNumber]);
    }
  }

  return Array.from(keyMap.entries())
    .filter(([, lines]) => lines.length > 1)
    .map(([key, lines]) => ({ key, lines }));
}

const NOISE_PATTERNS = [
  // Lockfiles (Auto-generated, high token usage)
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lockb$/,
  
  // Build Artifacts & Output
  /^dist\//,
  /^build\//,
  /^out\//,
  /^coverage\//, // Coverage reports
  /^\.next\//,
  /^\.nuxt\//,
  /^\.output\//,

  // Minified Code
  /\.min\.js$/,
  /\.min\.css$/,
  /\.map$/, // Source maps

  // Static Assets / Binaries
  /\.svg$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.ico$/,
  /\.pdf$/,
  /\.zip$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.mp4$/,
  /\.webm$/,
  
  // Data Files
  /\.geojson$/,
  /\.csv$/,
  /\.tsv$/,
  /\.xml$/,
  /\.sql$/, // SQL dumps/migrations are usually noise for logic review
  /\.xlsx?$/,
  
  // Vender / Third-party
  /^vendor\//,
  /^node_modules\//,
  
  // High-Gate Exclusions (Never send to AI)
  /prompts\//i,      // AI Instructions / Prompts
  /constants\/prompts/i,
  /system-messages?/i,
  /\.env(\..*)?$/,     // Environment variables
  /\.md$/,             // Documentation
  /\.markdown$/,
  /LICENSE$/,
  /CNAME$/,
  /\.txt$/,
  
  // Generated Code
  /generated\//i,
  /codegen\//i,
  /\.pb\.go$/,
  /\.gen\.ts$/,
  /drizzle\/meta\//,
  /migrations\//,

  // Tests (Separate mental model, skip for core logic review)
  /\.test\./i,
  /\.spec\./i,
  /__tests__\//,
  /tests\//i,
];

export function filterNoise<T extends DiffFile>(files: T[]): T[] {
  return files.filter((file) => {
    // Check extension and path
    const isNoise = NOISE_PATTERNS.some((pattern) => pattern.test(file.path));
    if (isNoise) return false;

    // Filter large generated files or binary by checking common markers if needed
    return true;
  });
}
