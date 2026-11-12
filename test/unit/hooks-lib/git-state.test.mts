// git-files.mts and git-state.mts (W8.3): what a repo says in its own files, and the git facts the runner keeps for the hooks.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { currentHead, gitDirsOf, refSha, refsFingerprint } from '../../../packs/base/hooks/lib/git-files.mts';
import { DIRTY_FRESH_MS, checkoutBranch, dirtyFiles, headFiles, keepGitState, noteGitState, refExistsIn, stateFileOf } from '../../../packs/base/hooks/lib/git-state.mts';
import { readJson, writeJson } from '../../../packs/base/hooks/lib/json.mts';
import { git } from '../../kit-cli.mts';

const RUNNER = fileURLToPath(new URL('../../../packs/base/hooks/run-hooks.mts', import.meta.url));

function repo(prefix: string): { dir: string; env: Record<string, string>; commit: (name: string, text: string) => void } {
  const dir = scratchDir(prefix);
  const env = { ...process.env, TMPDIR: scratchDir(`${prefix}tmp-`) } as Record<string, string>;
  git(dir, 'init', '-q', '-b', 'main');
  const commit = (name: string, text: string): void => { put(join(dir, name), text); git(dir, 'add', name); git(dir, 'commit', '-q', '-m', name); };
  return { dir, env, commit };
}

test('the branch, HEAD\'s commit and a ref are read from the git dir\'s files, loose and packed, in a worktree too', () => {
  const { dir, commit } = repo('gf-');
  commit('a.txt', 'a');
  const sha = git(dir, 'rev-parse', 'HEAD').trim();
  const dirs = gitDirsOf(dir);
  assert.ok(dirs);
  assert.deepEqual(currentHead(dirs), { branch: 'main', sha });
  git(dir, 'branch', 'work/x');
  assert.equal(refSha(dirs, 'work/x'), sha);
  git(dir, 'pack-refs', '--all');
  assert.equal(refSha(dirs, 'work/x'), sha, 'a packed ref');
  assert.equal(refSha(dirs, 'work/none'), null);
  const wt = join(dir, '.claude/worktrees/w1');
  git(dir, 'worktree', 'add', '-q', wt, 'work/x');
  const inWt = gitDirsOf(wt);
  assert.ok(inWt);
  assert.equal(inWt.common, dirs.common, 'a worktree shares the git dir');
  assert.equal(currentHead(inWt).branch, 'work/x');
  git(dir, 'checkout', '-q', '--detach');
  assert.deepEqual(currentHead(dirs), { branch: null, sha });
  assert.equal(gitDirsOf(join(dir, 'no-such-folder')), null);
});

test('the refs fingerprint moves for a commit, a remote ref, a worktree and a changed remote URL, and not for nothing', () => {
  const { dir, commit } = repo('gf-');
  commit('a.txt', 'a');
  const dirs = gitDirsOf(dir);
  assert.ok(dirs);
  const base = refsFingerprint(dirs);
  assert.equal(refsFingerprint(dirs), base);
  commit('b.txt', 'b');
  const afterCommit = refsFingerprint(dirs);
  assert.notEqual(afterCommit, base, 'a commit moves a branch');
  git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  const afterFetch = refsFingerprint(dirs);
  assert.notEqual(afterFetch, afterCommit, 'a push or fetch moves a remote ref');
  git(dir, 'worktree', 'add', '-q', '-b', 'work/y', join(dir, '.claude/worktrees/w2'));
  const afterTree = refsFingerprint(dirs);
  assert.notEqual(afterTree, afterFetch, 'a worktree and its branch');
  git(dir, 'remote', 'add', 'origin', 'https://example.invalid/a.git');
  assert.notEqual(refsFingerprint(dirs), afterTree, 'a remote URL is in the config');
});

test('headFiles: the kept list answers while HEAD is the commit it was taken at, git answers after, and empty files are not listed', () => {
  const { dir, env, commit } = repo('gs-');
  commit('docs-chart.mmd', 'flowchart LR\n');
  commit('empty.mmd', '');
  assert.deepEqual(headFiles(dir, env).map(([p]) => p), ['docs-chart.mmd'], 'no kept file: git, without the empty one');
  const dirs = gitDirsOf(dir);
  assert.ok(dirs);
  const sha = currentHead(dirs).sha;
  writeJson(stateFileOf(dir, env), { head: sha, stamp: 'x', at: Date.now(), dirty: [], tree: [['planted.mmd', 9]] });
  assert.deepEqual(headFiles(dir, env), [['planted.mmd', 9]], 'the kept list is read while HEAD is as it was (the plant: a list git does not hold)');
  commit('c.txt', 'c');
  assert.deepEqual(headFiles(dir, env).map(([p]) => p).sort(), ['c.txt', 'docs-chart.mmd'], 'HEAD moved: the kept list is not trusted, git answers');
});

test('keepGitState keeps HEAD\'s non-empty files and the dirty ones; dirtyFiles reads them while the stamp holds and for 30 s', () => {
  const { dir, env, commit } = repo('gs-');
  commit('a.txt', 'a');
  writeFileSync(join(dir, 'a.txt'), 'changed');
  keepGitState(dir, env, 1000);
  const kept = readJson<{ dirty: string[]; tree: [string, number][] }>(stateFileOf(dir, env));
  assert.deepEqual(kept?.tree, [['a.txt', 1]]);
  assert.deepEqual(kept?.dirty, [' M a.txt']);
  assert.deepEqual(dirtyFiles(dir, env, 1000 + 5000), [' M a.txt'], 'fresh: the kept list');
  put(stateFileOf(dir, env), JSON.stringify({ ...kept, head: null, stamp: readJson<{ stamp: string }>(stateFileOf(dir, env))?.stamp, at: 1000, dirty: ['PLANTED'] }));
  assert.deepEqual(dirtyFiles(dir, env, 1000 + 5000), ['PLANTED'], 'the plant: a kept list git does not hold is the one read while fresh');
  assert.deepEqual(dirtyFiles(dir, env, 1000 + DIRTY_FRESH_MS + 1), [' M a.txt'], 'older than 30 s: git answers');
  git(dir, 'add', 'a.txt');
  assert.deepEqual(dirtyFiles(dir, env, 1000 + 5000), ['M  a.txt'], 'the index moved: the stamp differs, git answers');
});

test('checkoutBranch and refExistsIn read the files; outside a checkout\'s own folder git is asked', () => {
  const { dir, env, commit } = repo('gs-');
  assert.equal(checkoutBranch(dir, env), 'main', 'an unborn branch is named by HEAD');
  assert.equal(refExistsIn(dir, env, 'origin/main'), false);
  commit('a.txt', 'a');
  git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.equal(refExistsIn(dir, env, 'origin/main'), true);
  put(join(dir, 'sub/x.txt'), 'x');
  assert.equal(checkoutBranch(join(dir, 'sub'), env), 'main', 'a subfolder: git is asked, the answer is the same');
  git(dir, 'checkout', '-q', '--detach');
  assert.equal(checkoutBranch(dir, env), '', 'detached: no branch');
});

test('noteGitState starts one detached refresh when the kept facts are stale, and none while one was just started or they are fresh', () => {
  const { dir, env, commit } = repo('gs-');
  commit('a.txt', 'a');
  const file = stateFileOf(dir, env);
  const t = Date.now();
  noteGitState(dir, env, RUNNER, t);
  noteGitState(dir, env, RUNNER, t + 1000);
  assert.ok(existsSync(`${file}.start`), 'a refresh was started');
  for (let i = 0; i < 100 && !existsSync(file); i++) readdirSync(dir), Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  assert.ok(existsSync(file), 'the detached refresh wrote the facts');
  const facts = readJson<{ tree: unknown[] }>(file);
  assert.equal(facts?.tree?.length, 1);
});
