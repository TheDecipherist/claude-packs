// The kit's command as the tests run it (one place, so their headers are not copies of each other): the CLI path, run
// (throws on a non-zero exit, returns stdout), cli (returns the spawn result), a fresh folder, a hook fired as Claude Code fires it.
import { execFileSync, spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from '../packs/base/hooks/lib/files.mts';

export { default as assert } from 'node:assert/strict';
export { test } from 'node:test';
export { execFileSync, spawnSync, join, put };
export { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';

/** A payload as Claude Code sends it to a hook. */
export type Payload = Record<string, unknown>;
export type Spawned = SpawnSyncReturns<string>;

export const KIT: string = fileURLToPath(new URL('..', import.meta.url));
export const CLI: string = join(KIT, 'bin/claude-packs.mjs');
export const run = (dir: string, ...args: string[]): string => execFileSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8' });
export const cli = (dir: string, ...args: string[]): Spawned => spawnSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8' });
export const fresh = (prefix: string): string => mkdtempSync(join(tmpdir(), prefix));
/** A fresh folder holding these files: { "rel/path": "text" }. */
export function projectWith(files: Readonly<Record<string, string>>, prefix = 'find-'): string {
  const dir = fresh(prefix);
  for (const [rel, text] of Object.entries(files)) put(join(dir, rel), text);
  return dir;
}
/** A hook of the project's `.claude/hooks` fired as its settings entry fires it (node for a .mjs, python3 for a .py). */
export const hookRun = (dir: string, name: string, payload: Payload, env: Readonly<Record<string, string>> = {}): Spawned =>
  spawnSync(name.endsWith('.py') ? 'python3' : 'node', [join(dir, '.claude/hooks', name)],
    { input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: dir, ...env } });
export const hookStatus = (dir: string, name: string, payload: Payload): number | null => hookRun(dir, name, payload).status;
/** A Write fired at the project's lesson checks, and a set of checks held to their examples through the hook, in a real install. */
export const lessonWrite = (dir: string, rel: string, content: string): Spawned =>
  hookRun(dir, 'lesson-checks.mjs', { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });

/** One test per [pack, file, bad, good, ...needs]: the pack installs, refuses the fault and takes the fix (`needs`: the packs this
 *  one requires, pack.json requires). */
export type EachCase = readonly [pack: string, file: string, bad: string, good: string, ...needs: string[]];
export function holdsEachCase(cases: readonly EachCase[], ...initArgs: string[]): void {
  for (const [pack, file, bad, good, ...needs] of cases) {
    test(`${pack}: ${file} is refused its fault and takes the fix`, () => {
      const dir = fresh(`case-${pack}-`);
      const r = cli(dir, 'init', pack, ...needs, ...initArgs);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      put(join(dir, file), '');
      assert.equal(lessonWrite(dir, file, bad).status, 2);
      assert.equal(lessonWrite(dir, file, good).status, 0);
    });
  }
}

/** A lesson check as its JSON holds it: what the examples tests read. */
export interface CheckExamples { id: string; bad: string; good: string }
export function holdToExamples(dir: string, checks: readonly CheckExamples[], fileFor: (check: CheckExamples) => string): void {
  for (const c of checks) {
    const file = fileFor(c);
    const r = lessonWrite(dir, file, c.bad);
    if (r.status !== 2 || !r.stderr.includes(c.id)) throw new Error(`${c.id}: its bad example was not refused in ${file}: ${r.status} ${r.stderr}`);
    if (lessonWrite(dir, file, c.good).status !== 0) throw new Error(`${c.id}: its good example was refused in ${file}`);
  }
}
export const selftest = (dir: string, hook: string): Spawned =>
  spawnSync('node', [join(dir, '.claude/hooks', hook), '--selftest'], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
