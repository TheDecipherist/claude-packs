// The worktree tests' rig: a real repo with the packs installed and committed, one agent worktree under .claude/worktrees/,
// and hooks fired the way Claude Code fires them (the main checkout's copy, CLAUDE_PROJECT_DIR = main).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
export const PIN_GUARD = fileURLToPath(new URL('../global/hooks/version-pin-guard.mjs', import.meta.url));
const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });
export const put = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };

export function project(initArgs, before = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cpw-'));
  execFileSync('node', [CLI, 'init', ...initArgs, '--dir', dir], { encoding: 'utf8' });
  before(dir);
  git(dir, 'init', '-q');
  git(dir, 'add', '-A');
  git(dir, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
  git(dir, 'worktree', 'add', '-q', '.claude/worktrees/agent-x', '-b', 'work/x');
  return { here: dir, wt: join(dir, '.claude/worktrees/agent-x') };
}

// A landing from the worktree, as land-branch makes one there (KWB-96): a bare "GitHub" beside the repo, the trunk and the
// worktree's branch pushed, and the worktree's new commit pushed to the trunk. Returns the trunk's name.
export function landFromWorktree({ here, wt }) {
  const hub = mkdtempSync(join(tmpdir(), 'cpw-hub-'));
  git(hub, 'init', '-q', '--bare');
  git(here, 'remote', 'add', 'origin', hub);
  const trunk = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: here, encoding: 'utf8' }).trim();
  git(here, 'push', '-q', 'origin', trunk);
  writeFileSync(join(wt, 'landed.txt'), 'landed\n');
  git(wt, 'add', 'landed.txt');
  git(wt, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'landed');
  git(wt, 'push', '-q', 'origin', 'work/x', `HEAD:refs/heads/${trunk}`);
  return trunk;
}

export const stellix = () => project(['audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix'], (dir) => {
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  writeFileSync(join(dir, 'lib/app/src/keep.h'), '// keep\n');
});

// node runs a .mjs hook, python3 a .py one, as the settings entries do.
export const fireAs = (here, hook, payload, env = {}) =>
  spawnSync(hook.endsWith('.py') ? 'python3' : 'node', [join(here, '.claude/hooks', hook)], { input: JSON.stringify(payload), env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: here, ...env }, encoding: 'utf8' });
// A hook's own `worktreeCase` (data beside its selftest, lib/selftest.mts WorktreeCase) as the check worktrees.test.mjs runs:
// `{here}` and `{wt}` in the files and in the events become the two checkouts, each step's exit code is the one it wants.
const swapPaths = (value, here, wt) => {
  if (typeof value === 'string') return value.replaceAll('{here}', here).replaceAll('{wt}', wt);
  if (Array.isArray(value)) return value.map((v) => swapPaths(v, here, wt));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swapPaths(v, here, wt)]));
  return value;
};
export const caseFrom = (hook, worktreeCase) => ({ here, wt }) => {
  for (const [file, text] of Object.entries(worktreeCase.files ?? {})) put(swapPaths(file, here, wt), swapPaths(text, here, wt));
  for (const step of worktreeCase.steps) assert.equal(fireAs(here, hook, swapPaths(step.event, here, wt)).status, step.want, `${hook}: ${step.label}`);
};
export const fire = (here, hook, file, content = '// new\n') => fireAs(here, hook, { tool_name: 'Write', tool_input: { file_path: file, content } }).status;
export const bash = (here, hook, command) => fireAs(here, hook, { tool_name: 'Bash', tool_input: { command } }).status;

// The same, for a hook of a pack other than base: its module imports the libs beside it as an install merges them, so the
// worktreeCase is read from the installed copy in the project under test (async: the caller awaits it).
export const installedCase = (hook) => async (checkouts) => {
  const { worktreeCase } = await import(pathToFileURL(join(checkouts.here, '.claude/hooks', hook)).href);
  caseFrom(hook, worktreeCase)(checkouts);
};
