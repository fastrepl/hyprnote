// Simple FNV-1a hash for content hashing
function hashString(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

// Module-level cache: path -> content hash
const contentHashes = new Map<string, string>();

/**
 * Checks if content has changed for a given path.
 * Returns true if content is different (should write), false if unchanged (skip write).
 */
export function shouldWriteFile(path: string, content: string): boolean {
  const newHash = hashString(content);
  const existingHash = contentHashes.get(path);

  if (existingHash === newHash) {
    return false;
  }

  contentHashes.set(path, newHash);
  return true;
}

/**
 * Manually update hash without comparison (for external writes)
 */
export function updateFileHash(path: string, content: string): void {
  const hash = hashString(content);
  contentHashes.set(path, hash);
}

/**
 * Remove a path from the hash cache (for file deletions)
 */
export function removeFileHash(path: string): void {
  contentHashes.delete(path);
}

/**
 * Clear entire cache (useful for testing or full reload scenarios)
 */
export function clearHashCache(): void {
  contentHashes.clear();
}
