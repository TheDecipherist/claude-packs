// doctor's memory of proved hooks (0.13.0, KWB-41): a hook's selftest proves the hook, so a hook that has not changed has nothing new
// to prove. One install took 0.1 s and its doctor 7.4 s, all of it hooks proving what they had already proved, on every init,
// update and test. A selftest that PASSED is remembered by the hash of what it ran: the hook, every file of hooks/lib, the runner,
// node's version, the platform, the detector and the project's guards. Change any of those and it runs again; a failure is never
// remembered; `doctor --fresh` runs them all. The memory is a folder of empty files, safe to delete.
//   CLAUDE_PACKS_SELFTEST_CACHE: the folder (default: claude-packs-selftests in the system temp folder)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const folder = () => process.env.CLAUDE_PACKS_SELFTEST_CACHE ?? join(tmpdir(), 'claude-packs-selftests');

// Every file under a folder, as absolute paths, sorted, Python's caches left out. Also the planner's bundle of a skill's folder.
export function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => e !== '__pycache__' && !e.endsWith('.pyc')).sort().flatMap((e) => {
    const abs = join(dir, e);
    return statSync(abs).isDirectory() ? filesUnder(abs) : [abs];
  });
}

// What every selftest of this install runs on, hashed once: the shared libs, the runner, the machine, the project's guards.
export function sharedHash(claudeDir, guards = {}) {
  const h = createHash('sha256');
  for (const f of [...filesUnder(join(claudeDir, 'hooks', 'lib')), join(claudeDir, 'hooks', 'run-hooks.mjs')]) if (existsSync(f)) h.update(readFileSync(f));
  h.update(`${process.version}\0${process.platform}\0${process.env.CLAUDE_PACKS_JSCPD ?? ''}\0${JSON.stringify(guards)}`);
  return h.digest('hex');
}

export const selftestKey = (file, shared) => createHash('sha256').update(shared).update(readFileSync(file)).digest('hex');
export const proved = (key) => existsSync(join(folder(), key));

// Never throws: a memory that cannot be written only means the selftest runs again next time.
export function remember(key) {
  try {
    mkdirSync(folder(), { recursive: true });
    writeFileSync(join(folder(), key), '');
  } catch { /* nothing to remember with */ }
}
