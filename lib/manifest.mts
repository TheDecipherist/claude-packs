// Tracks every file the packs installed, with its hash, so updates never overwrite a file
// The user changed and files removed from a pack are cleaned up.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import type { Lock } from '../packs/base/hooks/lib/types.d.mts';

export const LOCK = 'claude-packs.lock.json';

/** The sha256 of a file's bytes: the hash the lock keeps per managed file. */
export const hashFile = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');

/** The install lock of a project's `.claude` folder; an empty one when there is none. A lock that is not JSON throws: an
 *  install must not carry on, and write a new lock over what it could not read. */
export function readLock(claudeDir: string): Lock {
  const p = join(claudeDir, LOCK);
  if (!existsSync(p)) return { kit: '', packs: [], files: {} };
  const lock = readJson<Lock>(p);
  if (lock === null) throw new Error(`${p} is not valid JSON: fix it, or remove it and run init again`);
  return lock;
}

/** The lock written whole (a part file and a rename); a write the disk refuses throws. */
export function writeLock(claudeDir: string, lock: Partial<Lock>): void {
  if (!writeJson(join(claudeDir, LOCK), lock, { pretty: true })) throw new Error(`could not write ${join(claudeDir, LOCK)}`);
}

/** A managed file is "modified" when it exists and no longer matches the hash we wrote. */
export function isModified(projectDir: string, rel: string, lock: Lock): boolean {
  const abs = join(projectDir, rel);
  return existsSync(abs) && lock.files[rel] !== undefined && hashFile(abs) !== lock.files[rel];
}
