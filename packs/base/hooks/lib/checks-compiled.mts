// checks-compiled: the lesson checks of a project read once, at install, into one file (W8.3; runtime-cost survey, section 4:
// lesson-checks listed the checks folder and parsed every check file on every Write and Edit, 22 to 39 ms). `update` writes
// `.claude/checks.compiled.json` after the lock: the parsed checks and a key. The key is the hash of the lock plus the name, size
// and mtime of every check file, so a check the project added or edited itself (the lock does not list it) changes the key too.
// At run time the hook reads the compiled file when its key is the folder's now (one readdir and a stat per file, no parse); a
// stale or missing one is never trusted: the hook reads the files as it always did, and writes nothing (a judge writes no file).
//   checksKey(root) -> string | null          the key of the folder as it is; null when there is no checks folder
//   readCompiled<T>(root) -> checks | null    the compiled checks when their key is the folder's
//   writeCompiledChecks(root) -> boolean      compiles; false when a check file is not JSON (the hook then names it, as it did)
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from './files.mts';
import { shortHash } from './hash.mts';
import { readJson, writeJson } from './json.mts';
import { lockHash } from './proxy-wire.mts';

export const COMPILED_FILE = join('.claude', 'checks.compiled.json');
const LOCK_FILE = join('.claude', 'claude-packs.lock.json');

/** A check as its file holds it, with the file's name. */
export type Compiled<T> = T & { file: string };
interface Kept<T> { key: string; checks: Compiled<T>[] }

function checkFiles(root: string): string[] | null {
  try { return readdirSync(join(root, '.claude', 'checks')).filter((f) => f.endsWith('.json')).sort(); } catch { return null; }
}

export function checksKey(root: string): string | null {
  const names = checkFiles(root);
  if (names === null) return null;
  const stamps = names.map((f) => { try { const s = statSync(join(root, '.claude', 'checks', f)); return `${f}:${s.size}:${s.mtimeMs}`; } catch { return `${f}:?`; } });
  return shortHash([lockHash(readText(join(root, LOCK_FILE)) ?? ''), ...stamps].join('\n'), 20);
}

export function readCompiled<T>(root: string): Compiled<T>[] | null {
  const key = checksKey(root);
  const kept = key === null ? null : readJson<Kept<T>>(join(root, COMPILED_FILE));
  return kept !== null && kept.key === key && Array.isArray(kept.checks) ? kept.checks : null;
}

export function writeCompiledChecks(root: string): boolean {
  const key = checksKey(root);
  const names = checkFiles(root);
  if (key === null || names === null) return false;
  const checks: Compiled<Record<string, unknown>>[] = [];
  for (const file of names) {
    const raw = readJson<Record<string, unknown>>(join(root, '.claude', 'checks', file));
    if (raw === null) return false;
    checks.push({ ...raw, file });
  }
  return writeJson(join(root, COMPILED_FILE), { key, checks });
}
