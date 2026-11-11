// project.mts: what lies inside a project, and which checkout a file belongs to (W3.3: nothing read from the process).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { checkoutRoot, claudeRoot, commandLeavesProject, commonGitDir, insideProject, isWorktreeOfProject, relInCheckout } from '../../../packs/base/hooks/lib/project.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { gitRun } from '../../../packs/base/hooks/lib/git-run.mts';

const git = (cwd: string, ...args: string[]): void => {
  const r = gitRun(args, { cwd, env: process.env, identity: { name: 't', email: 't@t' } });
  assert.ok(r.ok, r.stderr);
};

test('insideProject: measured from the caller\'s base, never the process', () => {
  const root = scratchDir('proj-');
  assert.ok(insideProject(root, 'src/a.ts', root));
  assert.ok(insideProject(root, root, '/'));
  assert.equal(insideProject(root, '../x', root), false);
  assert.equal(insideProject(root, '', root), false);
  assert.equal(insideProject(root, undefined, root), false);
  assert.ok(insideProject(root, 'a.ts', join(root, 'sub')));          // the same name, another base
  assert.equal(insideProject(root, 'a.ts', '/elsewhere'), false);
});

test('commandLeavesProject: cd, pushd and -C outside leave; inside and plain commands stay; ~ is the caller\'s home', () => {
  const root = scratchDir('proj-');
  assert.equal(commandLeavesProject(root, 'ls', root, '/h'), false);
  assert.equal(commandLeavesProject(root, `cd ${root}/src && ls`, root, '/h'), false);
  assert.ok(commandLeavesProject(root, 'cd /elsewhere && rm x', root, '/h'));
  assert.ok(commandLeavesProject(root, 'git -C /elsewhere add .', root, '/h'));
  assert.ok(commandLeavesProject(root, 'cd ~/other', root, '/h'));
  assert.equal(commandLeavesProject(root, 'cd ~/other', root, `${root}/..`), true);
  assert.equal(commandLeavesProject(root, 'cd ~/src', root, root), false);
});

test('checkoutRoot, claudeRoot, relInCheckout: a worktree of the project is its own checkout; a nested repo is not', () => {
  const root = scratchDir('proj-');
  put(join(root, '.claude/layout.json'), '{}');
  put(join(root, 'a.txt'), 'x');
  git(root, 'init', '-q');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'i');
  git(root, 'worktree', 'add', '-q', '.claude/worktrees/w', '-b', 'work/w');
  const tree = join(root, '.claude/worktrees/w');
  assert.ok(isWorktreeOfProject(root, tree));
  assert.equal(isWorktreeOfProject(root, root), false);
  assert.equal(checkoutRoot(root, join(tree, 'a.txt'), root), tree);
  assert.equal(checkoutRoot(root, 'a.txt', root), root);
  assert.equal(checkoutRoot(root, 'a.txt', tree), tree);               // a relative file, measured from the base
  assert.equal(checkoutRoot(root, undefined, tree), root);
  assert.equal(claudeRoot(root, join(tree, 'a.txt'), root), tree);       // the worktree carries a layout.json
  assert.equal(relInCheckout(root, join(tree, 'a.txt'), root), 'a.txt');
  assert.equal(commonGitDir(tree), commonGitDir(root));
  // a nested clone is part of the project: its `.git` folder is no worktree of this repo
  put(join(root, 'vendor/x.h'), 'x');
  git(join(root, 'vendor'), 'init', '-q');
  assert.equal(checkoutRoot(root, join(root, 'vendor/x.h'), root), root);
  assert.equal(commonGitDir(scratchDir('nogit-')), null);               // no git here: null, not a throw
  assert.equal(isWorktreeOfProject(root, scratchDir('nogit-')), false);
});
