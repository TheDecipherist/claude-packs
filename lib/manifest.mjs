// Tracks every file the packs installed, with its hash, so updates never overwrite a file
// the user changed and files removed from a pack are cleaned up.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const LOCK = 'claude-packs.lock.json';

export const hashFile = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

export function readLock(claudeDir) {
  const p = join(claudeDir, LOCK);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { packs: [], files: {} };
}

export function writeLock(claudeDir, lock) {
  writeFileSync(join(claudeDir, LOCK), JSON.stringify(lock, null, 2) + '\n');
}

// A managed file is "modified" when it exists and no longer matches the hash we wrote.
export function isModified(projectDir, rel, lock) {
  const abs = join(projectDir, rel);
  return existsSync(abs) && lock.files[rel] !== undefined && hashFile(abs) !== lock.files[rel];
}
