export interface DiffChunk {
  file: string;
  chunkId: string;
  content: string;
  startLine: number;
  endLine: number;
}

export const CHUNK_SIZE = 500; // tokens approx
export const OVERLAP = 50;

export function chunkFile(path: string, content: string): DiffChunk[] {
  if (!content) {
    console.warn(`[Chunker] Skipping file ${path} - content is empty or undefined`);
    return [];
  }
  const chunks: DiffChunk[] = [];
  const lines = content.split('\n');
  
  let currentChunk: string[] = [];
  let currentStart = 1;
  let currentSize = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Simple char count approximation for speed
    const lineSize = line.length / 4; 

    if (currentSize + lineSize > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        file: path,
        chunkId: `${path}:${currentStart}-${i}`,
        content: currentChunk.join('\n'),
        startLine: currentStart,
        endLine: i,
      });
      
      // Handle overlap
      const overlapStart = Math.max(0, currentChunk.length - 10); // Keep last ~10 lines
      currentChunk = currentChunk.slice(overlapStart);
      currentStart = i - currentChunk.length + 1;
      currentSize = currentChunk.reduce((acc, l) => acc + l.length/4, 0);
    }

    currentChunk.push(line);
    currentSize += lineSize;
  }

  if (currentChunk.length > 0) {
    chunks.push({
      file: path,
      chunkId: `${path}:${currentStart}-${lines.length}`,
      content: currentChunk.join('\n'),
      startLine: currentStart,
      endLine: lines.length,
    });
  }

  return chunks;
}
