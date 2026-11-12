// The kit's command as the tests run it (one place, so their headers are not copies of each other): the CLI path, run
// (throws on a non-zero exit, returns stdout), cli (returns the spawn result), a fresh folder, a hook fired as Claude Code fires it.
import { execFileSync, spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync as hookFiles, rmSync as dropHook } from 'node:fs';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, readText } from '../packs/base/hooks/lib/files.mts';
import { gitRun } from '../packs/base/hooks/lib/git-run.mts';
import { TABLE_FILE, readHookTable } from '../packs/base/hooks/lib/hook-table.mts';
import { writeJson } from '../packs/base/hooks/lib/json.mts';
import { readLayout } from '../packs/base/hooks/lib/layout.mts';
import { proved, remember, selftestKey, sharedHash } from '../lib/selftest-cache.mts';

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
/** `init --auto` in a project: the install a suggest-then-install test ends with (its output, a throw on a non-zero exit). */
export const initAuto = (dir: string): string => run(dir, 'init', '--auto');
export const fresh = (prefix: string): string => mkdtempSync(join(tmpdir(), prefix));
const TEST_IDENTITY = { name: 't', email: 't@local' };
/** git in a test's folder, as the test's own identity: its stdout, or a throw with git's message, since the setup failed. */
export function git(cwd: string, ...args: string[]): string {
  const r = gitRun(args, { cwd, env: process.env, identity: TEST_IDENTITY });
  if (!r.ok) throw new Error(`git ${args.join(' ')}: ${r.stderr.trim()}`);
  return r.stdout;
}
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

/** The path of a tailored seed layout (`--profile` takes a path): `profile('stellix')`. */
export const profile = (name: string): string => join(KIT, 'test/fixtures/profiles', `${name}.layout.json`);

/** One test per [pack, file, bad, good]: the one all-packs fixture (test/fixtures/installs.mts, copied once per call) refuses the
 *  fault and takes the fix. The trailing `needs` (the packs a case's pack requires) are kept in the rows and not read: the one
 *  install holds every pack. */
export type EachCase = readonly [pack: string, file: string, bad: string, good: string, ...needs: string[]];
export function holdsEachCase(cases: readonly EachCase[]): void {
  let dir: string | null = null;
  for (const [pack, file, bad, good] of cases) {
    test(`${pack}: ${file} is refused its fault and takes the fix`, async () => {
      dir ??= (await import('./fixtures/installs.mts')).fixture('all-packs');
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
/** doctor with the selftests run, not taken as proved by the gate (a test whose subject is doctor's selftests; KWB-166). */
export const doctorRunning = (dir: string, ...args: string[]): Spawned =>
  spawnSync('node', [CLI, 'doctor', ...args, '--dir', dir], { encoding: 'utf8', env: { ...process.env, CLAUDE_PACKS_SELFTESTS: 'run' } });
/** A hook's `--selftest` in an install, once per run: one that already passed on the same bytes (the hook, the install's libs and
 *  guards, the machine: lib/selftest-cache.mts) is not run again, whether the test run or doctor proved it. A pass is remembered
 *  for both; a failure never is, so a changed or broken hook always runs. */
export const selftestOnce = (dir: string, hook: string): Pick<Spawned, 'status' | 'stdout' | 'stderr'> => {
  const claudeDir = join(dir, '.claude');
  const file = join(claudeDir, 'hooks', hook);
  const guards = readLayout(dir).guards;
  const key = selftestKey(file, sharedHash(claudeDir, guards));
  if (proved(key)) return { status: 0, stdout: 'selftest: OK (proved earlier in this run)\n', stderr: '' };
  const r = selftest(dir, hook);
  if (r.status === 0) remember(key);
  return r;
};

// W5-h: a test about what doctor does with selftests (the cache, a failing one) runs them on a few hooks, not on all of an install's:
// the 30 of a base install take 28 s to prove, the ten kept 8 s, and the subject (what is remembered, what fails) is the same.
const FEW_HOOKS = ['folder-law.mjs', 'secrets-guard.mjs', 'untrusted-boundary.mjs', 'skill-first.mjs', 'suite-once.mjs', 'heartbeat.mjs', 'placement-law.mjs', 'file-size-guard.mjs', 'inside-the-project.mjs', 'no-find.mjs'];
/** `dir`'s `.claude/hooks` cut down to ten quick ones, the hooks named in `also`, the runner, the lesson checks and `lib/`; settings and the lock stay as they were. */
export function keepHooks(dir: string, also: readonly string[] = []): string {
  for (const f of hookFiles(join(dir, '.claude/hooks'))) {
    if (f.endsWith('.mjs') && f !== 'run-hooks.mjs' && f !== 'lesson-checks.mjs' && !FEW_HOOKS.includes(f) && !also.includes(f)) dropHook(join(dir, '.claude/hooks', f));
  }
  // the runner's table names only the hooks that are left (a row with no file is a crash, and doctor says so)
  const hooks = join(dir, '.claude/hooks');
  const table = readHookTable(hooks);
  if (table !== null) writeJson(join(hooks, TABLE_FILE), table.filter((r) => hookFiles(hooks).includes(`${r.hook}.mjs`)), { pretty: true });
  return dir;
}

/** The hooks an install registers (names without the extension): those a settings entry names (a project's own, heartbeat, a pre-W8.1
 *  install) and every row of the table the runner reads (`.claude/hooks/hooks.json`, W8.1); since then settings.json names the runner. */
export function registeredHooks(dir: string): string[] {
  const settings = readText(join(dir, '.claude/settings.json')) ?? '';
  const named = [...settings.matchAll(/\.claude\/hooks\/([\w-]+)\.(?:mjs|py)/g)].map((m) => m[1] ?? '');
  const rows = (readHookTable(join(dir, '.claude/hooks')) ?? []).map((r) => r.hook);
  return [...new Set([...named, ...rows])];
}
