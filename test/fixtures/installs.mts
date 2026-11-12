// The installs the tests share (W5.4, survey section 4): each configuration is installed once per run, by the `fresh-tmp` hand-off
// (CLAUDE_PACKS_FIXTURES, a folder of the run) and a build lock, and `fixture(name)` returns a copy of it for one test. A copy needs
// no rewrite (W1.4: an install names no absolute path); it leaves out what a used install holds of its own: `.claude/logs`,
// `.claude/hooks.log`, `.claude/state`. With the small helpers every test wants beside an install: a payload, a transcript, a
// layout patch, the lock, a scratch repo's git.
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { alive } from '../../packs/base/hooks/lib/daemon-find.mts';
import { ensureDir, isDir, put, readText, scratchDir, walk } from '../../packs/base/hooks/lib/files.mts';
import { gitRun } from '../../packs/base/hooks/lib/git-run.mts';
import { readJson, toJson, writeJson } from '../../packs/base/hooks/lib/json.mts';
import { bashOf, writeOf } from '../../packs/base/hooks/lib/selftest.mts';
import type { Lock } from '../../packs/base/hooks/lib/types.d.mts';
import { readConfig } from '../../lib/configs.mts';
import { KIT, profile, run } from '../kit-cli.mts';

/** A Write and a Bash payload as Claude Code sends them (selftest's builders, under the names the tests use). */
export const write = writeOf;
export const bash = bashOf;

/** One configuration's install: what `init` is given. The names are the survey's; a test names one, never the arguments. */
export const FIXTURES = {
  'base': ['--config', 'base'],
  'audio-core': ['audio-core'],
  'audio-core+gpu-painter': ['audio-core', 'gpu-painter'],
  'audio-core+stellix': ['audio-core', 'stellix'],
  'stellix-profile': ['audio-core', 'gpu-painter', 'stellix', '--profile', profile('stellix')],
  'synth-creator': ['--config', 'synth-creator'],
  'cpp': ['--config', 'cpp'],
  'js-ts': ['js-ts'],
  'next-app': ['next-app'],
  'full-stack': ['--config', 'full-stack'],
  'go+multi-tenant': ['--config', 'go', 'multi-tenant'],
  'python+shell': ['--config', 'python', 'shell'],
  'http-api-family': ['http-api', 'fastify', 'zod'],
  'rust': ['--config', 'rust'],
} as const satisfies Record<string, readonly string[]>;
/** The installs that are not one `init`: `all-packs` is the synth-creator configuration with every pack it takes, with the lesson
 *  checks of the node configuration's packs beside them (the layout the audio cases ran in; the checks name their own globs), since no one configuration takes both (what `holdsEachCase` fires its checks at). */
export type FixtureName = keyof typeof FIXTURES | 'all-packs';

// What a used install holds that a fresh one does not: the runner's logs and the hooks' state (a crash logged in the source
// would turn every copy's doctor red).
const USED = /^\.claude\/(?:logs|state)(?:\/|$)|^\.claude\/hooks\.log$/;

/** A copy of an install, without what using it left (`.claude/logs`, `.claude/hooks.log`, `.claude/state`). */
export function copyInstall(source: string, into: string): string {
  cpSync(source, into, { recursive: true, filter: (from) => !USED.test(relative(source, from).replace(/\\/g, '/')) });
  return into;
}

/** The files of a copy that name the folder it was copied from: none for a clean install (W1.4), so any is a stale path. */
export function strayPaths(copy: string, source: string): string[] {
  return walk(copy).filter((file) => {
    try { return readFileSync(file, 'utf8').includes(source); } catch { return false; }
  }).map((file) => relative(copy, file));
}

const sleep = (ms: number): void => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };

/** `name` built once under `root`, however many processes ask: the first takes the lock (an atomic `mkdir`) and builds beside, then
 *  renames the result into place; the others wait for it. A lock whose holder is gone is taken over. Returns the built folder. */
export function buildOnce(root: string, name: string, build: (into: string) => void, { waitMs = 600_000, graceMs = 30_000 } = {}): string {
  ensureDir(root);
  const done = join(root, name);
  const lock = join(root, `${name}.lock`);
  const started = Date.now();
  while (!isDir(done)) {
    try {
      mkdirSync(lock);
    } catch {
      const pid = Number(readText(join(lock, 'pid'))?.trim() ?? 0);
      const stale = pid ? !alive(pid) : existsSync(lock) && Date.now() - statSync(lock).mtimeMs > graceMs;
      if (stale) rmSync(lock, { recursive: true, force: true });
      else if (Date.now() - started > waitMs) throw new Error(`waited ${waitMs} ms for the ${name} install another process is building`);
      else sleep(100);
      continue;
    }
    const building = join(root, `${name}.building-${process.pid}`);
    try {
      writeFileSync(join(lock, 'pid'), String(process.pid));
      if (isDir(done)) break;
      rmSync(building, { recursive: true, force: true });
      mkdirSync(building);
      build(building);
      renameSync(building, done);
    } finally {
      rmSync(building, { recursive: true, force: true });
      rmSync(lock, { recursive: true, force: true });
    }
  }
  return done;
}

/** Where the run's installs are built: the preload's hand-off, else a folder of this process (a test run by hand without it). */
const fixturesRoot = (): string => process.env.CLAUDE_PACKS_FIXTURES ?? join(tmpdir(), `claude-packs-fixtures-${process.pid}`);

const OTHER_PACKS_CHECKS: readonly string[] = ['fetch-needs-timeout.json', 'cpp-no-mutable-global.json', 'one-seeded-random.json'];
const synthPacks = (): string[] => [...readConfig('synth-creator').packs.choose];
const nodePacks = (): string[] => [...readConfig('node').packs.choose];

/** Build one fixture into a folder: its `init` arguments, or for `all-packs` two installs whose checks are put in one. */
function buildFixture(name: FixtureName, into: string): void {
  if (name !== 'all-packs') { run(into, 'init', ...FIXTURES[name]); return; }
  run(into, 'init', '--config', 'synth-creator', ...synthPacks());
  const node = scratchDir('fixture-node-');
  run(node, 'init', '--config', 'node', ...nodePacks());
  for (const file of readdirSync(join(node, '.claude/checks'))) {
    if (!existsSync(join(into, '.claude/checks', file))) copyFileSync(join(node, '.claude/checks', file), join(into, '.claude/checks', file));
  }
  // The checks a case's good text meets in a pack the case does not name: a bare fetch in the http-api case's UI file, a
  // statement at the top of the midi and sound-design cases' C++ files read as a mutable global, a seeded generator in the stellix pack's one-generator law. Each pack proves its own check
  // through doctor's bad/good examples.
  for (const other of OTHER_PACKS_CHECKS) rmSync(join(into, '.claude/checks', other), { force: true });
}

/** A copy of the run's install of this configuration, in a folder of its own for the test to change. Built the first time anyone asks. */
export function fixture(name: FixtureName): string {
  const built = buildOnce(fixturesRoot(), name, (into) => { buildFixture(name, into); });
  return copyInstall(built, scratchDir(`fixture-${name.replace(/\W+/g, '-')}-`));
}

/** The lines of a transcript, as Claude Code keeps it (`.jsonl`), written to `dir/<name>`; the path. */
export function transcript(dir: string, turns: readonly unknown[], name = 'transcript.jsonl'): string {
  const file = join(dir, name);
  put(file, turns.map((turn) => `${toJson(turn)}\n`).join(''));
  return file;
}

/** The project's `.claude/layout.json` with these keys merged in, key by key (a function is given the current layout and returns them). */
export function withLayout(dir: string, patch: Record<string, unknown> | ((layout: Record<string, unknown>) => Record<string, unknown>)): void {
  const file = join(dir, '.claude/layout.json');
  const layout = readJson<Record<string, unknown>>(file, {}) ?? {};
  writeJson(file, { ...layout, ...(typeof patch === 'function' ? patch(layout) : patch) }, { pretty: true });
}

/** The install's lock: what it holds and at which version; every field may be missing, since a folder may hold none. */
export type InstallLock = Partial<Lock>;
export const lockOf = (dir: string): InstallLock => readJson<InstallLock>(join(dir, '.claude/claude-packs.lock.json'), {}) ?? {};

/** git in a scratch repo, with the one identity tests commit as; what it printed, trimmed. A failure throws with git's own words. */
export function git(dir: string, ...args: string[]): string {
  const r = gitRun(args, { cwd: dir, env: process.env, identity: { name: 't', email: 't@t' } });
  if (!r.ok) throw new Error(`git ${args.join(' ')} (in ${dir}): ${r.stderr.trim() || r.status}`);
  return r.stdout.trim();
}
