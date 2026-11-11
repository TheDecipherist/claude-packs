// The worktree tests' rig: a real repo with the packs installed and committed, one agent worktree under .claude/worktrees/,
// and hooks fired the way Claude Code fires them (the main checkout's copy, CLAUDE_PROJECT_DIR = main).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { put, scratchDir } from '../packs/base/hooks/lib/files.mts';
import { parseJson, toJson } from '../packs/base/hooks/lib/json.mts';
import type { WorktreeCase } from '../packs/base/hooks/lib/selftest.mts';
import { git, withLayout } from './fixtures/installs.mts';
import { CLI, profile } from './kit-cli.mts';

export { CLI, put };
export const PIN_GUARD: string = fileURLToPath(new URL('../global/hooks/version-pin-guard.mjs', import.meta.url));

/** The project's main checkout and the agent worktree under it. */
export interface Checkouts { here: string; wt: string }

// The rig's own source folders, neutral words: a hook's worktree case names `src/core` and `src/engine`, and base holds no
// domain word (test/base-neutral.test.mjs). The install's own folders stay; these are added to the layout beside them.
export const RIG_FOLDERS = {
  core: { path: 'src/core', purpose: 'the shared core: blocks every other folder builds on' },
  engine: { path: 'src/engine', purpose: 'the engine that drives the core' },
} as const;

/** An installed project's folder made a git repo with the rig's folders in its layout, committed, and one agent worktree under it
 *  (`project` below installs one first; the hook tier hands it a copy of a fixture). `before` runs on the folder first. */
export function checkoutsOf(dir: string, before: (dir: string) => void = () => {}): Checkouts {
  withLayout(dir, (layout) => ({ folders: { ...(layout.folders as Record<string, unknown>), ...RIG_FOLDERS } }));
  before(dir);
  git(dir, 'init', '-q');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'init');
  git(dir, 'worktree', 'add', '-q', '.claude/worktrees/agent-x', '-b', 'work/x');
  return { here: dir, wt: join(dir, '.claude/worktrees/agent-x') };
}

export function project(initArgs: readonly string[], before: (dir: string) => void = () => {}): Checkouts {
  const dir = scratchDir('cpw-');
  execFileSync('node', [CLI, 'init', ...initArgs, '--dir', dir], { encoding: 'utf8' });
  return checkoutsOf(dir, before);
}

/** A landing from the worktree, as land-branch makes one there (KWB-96): a bare "GitHub" beside the repo, the trunk and the
 *  worktree's branch pushed, and the worktree's new commit pushed to the trunk. Returns the trunk's name. */
export function landFromWorktree({ here, wt }: Checkouts): string {
  const hub = scratchDir('cpw-hub-');
  git(hub, 'init', '-q', '--bare');
  git(here, 'remote', 'add', 'origin', hub);
  const trunk = git(here, 'rev-parse', '--abbrev-ref', 'HEAD');
  git(here, 'push', '-q', 'origin', trunk);
  writeFileSync(join(wt, 'landed.txt'), 'landed\n');
  git(wt, 'add', 'landed.txt');
  git(wt, 'commit', '-qm', 'landed');
  git(wt, 'push', '-q', 'origin', 'work/x', `HEAD:refs/heads/${trunk}`);
  return trunk;
}

export const stellix = (): Checkouts => project(['audio-core', 'gpu-painter', 'stellix', '--profile', profile('stellix')], (dir) => {
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  writeFileSync(join(dir, 'lib/app/src/keep.h'), '// keep\n');
});

/** node runs a .mjs hook, python3 a .py one, as the settings entries do. */
export const fireAs = (here: string, hook: string, payload: unknown, env: Readonly<Record<string, string>> = {}) =>
  spawnSync(hook.endsWith('.py') ? 'python3' : 'node', [join(here, '.claude/hooks', hook)],
    { input: JSON.stringify(payload), env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: here, ...env }, encoding: 'utf8' });

/** A hook's own `worktreeCase` (data beside its selftest, lib/selftest.mts WorktreeCase) as the check worktrees.test.mjs runs:
 *  `{here}` and `{wt}` in the files and in the events become the two checkouts, each step's exit code is the one it wants. */
const swapPaths = (value: unknown, here: string, wt: string): unknown => {
  if (typeof value === 'string') return value.replaceAll('{here}', here).replaceAll('{wt}', wt);
  if (Array.isArray(value)) return value.map((v) => swapPaths(v, here, wt));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swapPaths(v, here, wt)]));
  return value;
};
// A case's `.claude/layout.json` is merged into the checkout's own layout, key by key, never put in its place: every case works in
// the same worktree, and the layout a later one reads must still be the project's.
const putCaseFile = (file: string, text: string): void => {
  const own = file.endsWith('.claude/layout.json') && existsSync(file) ? parseJson<Record<string, unknown>>(readFileSync(file, 'utf8')) : null;
  const added = own ? parseJson<Record<string, unknown>>(text) : null;
  put(file, own && added ? toJson({ ...own, ...added }) : text);
};
export const caseFrom = (hook: string, worktreeCase: WorktreeCase) => ({ here, wt }: Checkouts): void => {
  for (const [file, text] of Object.entries(worktreeCase.files ?? {})) putCaseFile(String(swapPaths(file, here, wt)), String(swapPaths(text, here, wt)));
  for (const step of worktreeCase.steps) assert.equal(fireAs(here, hook, swapPaths(step.event, here, wt)).status, step.want, `${hook}: ${step.label}`);
};
export const fire = (here: string, hook: string, file: string, content = '// new\n'): number | null =>
  fireAs(here, hook, { tool_name: 'Write', tool_input: { file_path: file, content } }).status;
export const bash = (here: string, hook: string, command: string): number | null =>
  fireAs(here, hook, { tool_name: 'Bash', tool_input: { command } }).status;

/** The `worktreeCase` a hook module exports (its module as imported, not yet known to have one). */
export function worktreeCaseOf(module: unknown, hook: string): WorktreeCase {
  const found = module && typeof module === 'object' && 'worktreeCase' in module ? module.worktreeCase : null;
  if (!found || typeof found !== 'object' || !('steps' in found)) throw new Error(`${hook} exports no worktreeCase`);
  return found as WorktreeCase;
}

/** The same, for a hook of a pack other than base: its module imports the libs beside it as an install merges them, so the
 *  worktreeCase is read from the installed copy in the project under test (async: the caller awaits it). */
export const installedCase = (hook: string) => async (checkouts: Checkouts): Promise<void> => {
  const module: unknown = await import(pathToFileURL(join(checkouts.here, '.claude/hooks', hook)).href);
  caseFrom(hook, worktreeCaseOf(module, hook))(checkouts);
};
