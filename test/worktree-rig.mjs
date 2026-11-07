// The worktree tests' rig: a real repo with the packs installed and committed, one agent worktree under .claude/worktrees/,
// and hooks fired the way Claude Code fires them (the main checkout's copy, CLAUDE_PROJECT_DIR = main).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
export const PIN_GUARD = fileURLToPath(new URL('../global/hooks/version-pin-guard.mjs', import.meta.url));
export const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });
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

export const stellix = () => project(['audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix'], (dir) => {
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  writeFileSync(join(dir, 'lib/app/src/keep.h'), '// keep\n');
});

// node runs a .mjs hook, python3 a .py one, as the settings entries do.
export const fireAs = (here, hook, payload, env = {}) =>
  spawnSync(hook.endsWith('.py') ? 'python3' : 'node', [join(here, '.claude/hooks', hook)], { input: JSON.stringify(payload), env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: here, ...env }, encoding: 'utf8' });
export const fire = (here, hook, file, content = '// new\n') => fireAs(here, hook, { tool_name: 'Write', tool_input: { file_path: file, content } }).status;
export const bash = (here, hook, command) => fireAs(here, hook, { tool_name: 'Bash', tool_input: { command } }).status;
