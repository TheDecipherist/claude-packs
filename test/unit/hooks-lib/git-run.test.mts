// git-run.mts: the one git runner (W2.5): the caller's folder and env, one result type, an identity for commits.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { gitBlobs, gitLines, gitOut, gitRun } from '../../../packs/base/hooks/lib/git-run.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const who = { name: 'unit', email: 'unit@local' };

test('runs in the caller\'s folder with the caller\'s env, and commits as the identity given', () => {
  const dir = scratchDir('git-run-');
  const at = { cwd: dir, env: { PATH: process.env.PATH, HOME: dir, GIT_CONFIG_NOSYSTEM: '1' } };
  assert.ok(gitRun(['init', '-q', '-b', 'main'], at).ok);
  put(join(dir, 'a.txt'), 'a\n');
  assert.ok(gitRun(['add', 'a.txt'], at).ok);
  const commit = gitRun(['commit', '-qm', 'first'], { ...at, identity: who });
  assert.ok(commit.ok, commit.stderr);
  assert.equal(gitOut(['log', '-1', '--format=%an <%ae>'], at), 'unit <unit@local>');
  assert.equal(gitOut(['rev-parse', '--abbrev-ref', 'HEAD'], at), 'main');
});

test('a failure is a result, never a throw; gitLines keeps a porcelain line\'s leading space', () => {
  const dir = scratchDir('git-run-');
  const at = { cwd: dir, env: { PATH: process.env.PATH, HOME: dir } };
  const r = gitRun(['rev-parse', 'HEAD'], at);
  assert.equal(r.ok, false);
  assert.ok(r.status !== 0 && r.stderr.length > 0);
  assert.equal(gitOut(['rev-parse', 'HEAD'], at), null);
  assert.deepEqual(gitLines(['rev-parse', 'HEAD'], at), []);
  gitRun(['init', '-q'], at);
  put(join(dir, 'a.txt'), 'a\n');
  gitRun(['add', 'a.txt'], at);
  gitRun(['commit', '-qm', 'x'], { ...at, identity: who });
  put(join(dir, 'a.txt'), 'b\n');
  assert.deepEqual(gitLines(['status', '--porcelain'], at), [' M a.txt']);
});

test('gitBlobs reads every file at HEAD in one go, by bytes; a file git does not hold is null (KWB-next)', () => {
  const dir = scratchDir('git-blobs-');
  const at = { cwd: dir, env: { PATH: process.env.PATH, HOME: dir, GIT_CONFIG_NOSYSTEM: '1' } };
  assert.ok(gitRun(['init', '-q', '-b', 'main'], at).ok);
  put(join(dir, 'a.txt'), 'first\nsecond\n');
  put(join(dir, 'sub/b.md'), 'größe – 5 µs\n');
  assert.ok(gitRun(['add', 'a.txt', 'sub/b.md'], at).ok);
  assert.ok(gitRun(['commit', '-qm', 'first'], { ...at, identity: who }).ok);
  put(join(dir, 'loose.txt'), 'never added\n');
  const got = gitBlobs(['HEAD:a.txt', 'HEAD:loose.txt', 'HEAD:sub/b.md', 'HEAD:nowhere.txt'], at);
  assert.equal(got.get('HEAD:a.txt'), 'first\nsecond\n');
  assert.equal(got.get('HEAD:sub/b.md'), 'größe – 5 µs\n');
  assert.equal(got.get('HEAD:loose.txt'), null);
  assert.equal(got.get('HEAD:nowhere.txt'), null);
  assert.equal(gitBlobs([], at).size, 0);
});
