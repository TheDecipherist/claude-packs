// doctor's memory of proved hooks (0.13.0, KWB-41): a hook's selftest proves the hook, so a hook that has not changed has nothing new
// to prove. One install took 0.1 s and its doctor 7.4 s, all of it hooks proving what they had already proved, on every init,
// update and test. A selftest that PASSED is remembered by the hash of what it ran: the hook and each file it imports, directly or
// through others (d-7: a change to one lib reruns the hooks that import it, not all 46), the runner, node's version, the platform,
// the detector and the project's guards. Change any of those and it runs again; a failure is never remembered; `doctor --fresh`
// runs them all. The memory is a folder of empty files, safe to delete.
//   CLAUDE_PACKS_SELFTEST_CACHE: the folder (default: ~/.cache/claude-packs/selftests; a test run sets its own, which wins)
//   The env is the caller's, a parameter that defaults to the process's own for the importers that do not pass one yet.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { notInstalled, walk } from '../packs/base/hooks/lib/files.mts';

export type CacheEnv = Readonly<Record<string, string | undefined>>;

const folder = (env: CacheEnv): string => env.CLAUDE_PACKS_SELFTEST_CACHE ?? join(homedir(), '.cache', 'claude-packs', 'selftests');

/** Every file under a folder, as absolute paths, sorted, caches left out (files.mts owns the walk); also the planner's bundle
 *  of a skill's folder. What the hash reads is what an install holds, so a build-only file never counts (W2.3). */
export const filesUnder = (dir: string): string[] => walk(dir, notInstalled);

/** What every selftest of this install runs on, hashed once: the runner, the machine, the detector, the project's guards. The libs
 *  are no part of it: each hook's key reads the ones it imports (selftestKey).
 *  (sha256 of the content, not hash.mts's short sha1: the key names a file in a shared folder and covers whole files.) */
export function sharedHash(claudeDir: string, guards: unknown = {}, env: CacheEnv = process.env): string {
  const h = createHash('sha256');
  const runner = join(claudeDir, 'hooks', 'run-hooks.mjs');
  if (existsSync(runner)) h.update(readFileSync(runner));
  h.update(`${process.version}\0${process.platform}\0${env.CLAUDE_PACKS_JSCPD ?? ''}\0${JSON.stringify(guards)}`);
  return h.digest('hex');
}

const SPECIFIER = [/\bfrom\s+['"](\.{1,2}\/[^'"]*)['"]/g, /\bimport\s*\(\s*['"](\.{1,2}\/[^'"]*)['"]/g, /\bimport\s+['"](\.{1,2}\/[^'"]*)['"]/g];

/** A module and every file it imports by a relative path, directly or through others, as absolute paths in name order. A file
 *  that is no JavaScript (a Python hook) has none; a specifier that names nothing on disk is left out. */
export function importsOf(file: string): string[] {
  const seen = new Set<string>();
  const queue = [resolve(file)];
  for (let f = queue.shift(); f !== undefined; f = queue.shift()) {
    if (seen.has(f) || !existsSync(f)) continue;
    seen.add(f);
    if (!/\.(?:mjs|js|mts|ts)$/.test(f)) continue;
    const text = readFileSync(f, 'utf8');
    for (const re of SPECIFIER) for (const m of text.matchAll(re)) queue.push(resolve(dirname(f), m[1] ?? ''));
  }
  return [...seen].sort();
}

/** The key of one hook's selftest: the shared hash, then the bytes of the hook and of each file it imports, directly or through
 *  others (no path goes in: two projects holding the same hook share the memory). */
export function selftestKey(file: string, shared: string): string {
  const h = createHash('sha256').update(shared);
  for (const f of importsOf(file)) h.update(readFileSync(f)).update('\0');
  return h.digest('hex');
}

export const proved = (key: string, env: CacheEnv = process.env): boolean => existsSync(join(folder(env), key));

/** Never throws: a memory that cannot be written only means the selftest runs again next time. */
export function remember(key: string, env: CacheEnv = process.env): void {
  try {
    mkdirSync(folder(env), { recursive: true });
    writeFileSync(join(folder(env), key), '');
  } catch { /* nothing to remember with */ }
}
