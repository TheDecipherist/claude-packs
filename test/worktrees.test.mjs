// Agents work in git worktrees under .claude/worktrees/, while CLAUDE_PROJECT_DIR still points at the
// main checkout. Every hook must judge a worktree file against its own checkout (Stellix WB-41, WB-55:
// folder-law refused every new file in a worktree, and agents routed new code into unrelated files).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });

function project() {
  const dir = mkdtempSync(join(tmpdir(), 'cpw-'));
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  execFileSync('node', [CLI, 'init', 'audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix', '--dir', dir], { encoding: 'utf8' });
  writeFileSync(join(dir, 'lib/app/src/keep.h'), '// keep\n');
  git(dir, 'init', '-q');
  git(dir, 'add', '-A');
  git(dir, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
  git(dir, 'worktree', 'add', '-q', '.claude/worktrees/agent-x', '-b', 'work/x');
  return dir;
}

const fire = (here, hook, file, content = '// new\n') =>
  spawnSync('node', [join(here, '.claude/hooks', hook)], {
    input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: file, content } }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: here },
  }).status;

test('folder-law allows a new file in a right folder of a worktree and refuses a wrong one', () => {
  const here = project();
  const wt = join(here, '.claude/worktrees/agent-x');
  assert.equal(fire(here, 'folder-law.mjs', join(wt, 'lib/app/src/host_groups.h')), 0);
  assert.equal(fire(here, 'folder-law.mjs', join(wt, 'random/stray.cpp')), 2);
  assert.equal(fire(here, 'folder-law.mjs', join(here, 'lib/app/src/fine.h')), 0);
  assert.equal(fire(here, 'folder-law.mjs', join(here, 'random/stray.cpp')), 2);
});

test('file-size-guard measures a worktree file by its own checkout', () => {
  const here = project();
  const wt = join(here, '.claude/worktrees/agent-x');
  assert.equal(fire(here, 'file-size-guard.mjs', join(wt, 'lib/app/src/small.h')), 0);
  assert.equal(fire(here, 'file-size-guard.mjs', join(wt, 'lib/app/src/huge.h'), 'x\n'.repeat(400)), 2);
});
