// repo-litter: a screenshot, a trace or an oversize file is not added to git. The hook's contract, then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { bash, git } from '../../fixtures/installs.mts';
import { assert, existsSync, hookRun, test } from '../../kit-cli.mts';
import { commandCase } from '../command-case.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'repo-litter.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    git(project, 'init', '-q');
    put(join(project, 'litter-shot.png'), 'x');
    return { payload: bash('git add litter-shot.png', project), status: 2 };
  },
  worktree: commandCase('repo-litter.mjs'),
});

test('repo-litter comes with base and judges a git add', () => {
  const dir = fixture('base');
  assert.ok(existsSync(join(dir, '.claude/hooks/repo-litter.mjs')));
  assert.equal(hookRun(dir, 'repo-litter.mjs', { tool_name: 'Bash', tool_input: { command: 'git status' }, cwd: dir }).status, 0);
});

test('a download marker that breaks a Windows checkout is refused', () => {
  const dir = fixture('base');
  git(dir, 'init', '-q');
  put(join(dir, 'book.pdf:Zone.Identifier'), 'x');
  assert.equal(hookRun(dir, 'repo-litter.mjs', bash('git add book.pdf:Zone.Identifier', dir)).status, 2);
});
