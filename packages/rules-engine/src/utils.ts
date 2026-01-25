export function matchesGlob(path: string, glob: string): boolean {
  if (glob === '*') return true;
  if (glob.startsWith('*.')) {
    return path.endsWith(glob.slice(1));
  }
  if (glob.endsWith('/*')) {
    return path.startsWith(glob.slice(0, -1));
  }
  // Simple exact match or contains
  return path.includes(glob.replace(/\*/g, ''));
}
