// remote-heads.mts: what GitHub holds, for git-guard's pushed laws; the token is read, never written, and a folder with no remote is said so.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { join } from 'node:path';
import { failed, gitAt, isGitHub, pushSeen, remoteHeads, target, tokenFor, urlOf, withHeads } from '../../../packs/base/hooks/lib/remote-heads.mts';
import { pushDirs } from '../../../packs/base/hooks/lib/git-parts.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('gitAt never prompts, caps the call and carries the input only when given', () => {
  const o = gitAt('/w', { A: '1' }, { B: '2' });
  assert.equal(o.env?.['GIT_TERMINAL_PROMPT'], '0');
  assert.equal(o.env?.['A'], '1');
  assert.equal(o.env?.['B'], '2');
  assert.equal(o.timeoutMs, 15_000);
  assert.equal('input' in o, false);
  assert.equal(gitAt('/w', {}, {}, 'x').input, 'x');
});

test('the token is the environment\'s, else the one line in ~/.env; a quoted value is unquoted, a missing one is null', () => {
  const home = scratchDir('heads-home-');
  put(join(home, '.env'), 'OTHER=1\nexport MY_TOKEN="abc123"\n');
  assert.equal(tokenFor('MY_TOKEN', { HOME: home }), 'abc123');
  assert.equal(tokenFor('MY_TOKEN', { HOME: home, MY_TOKEN: 'env-wins' }), 'env-wins');
  assert.equal(tokenFor('NOPE', { HOME: home }), null);
  assert.equal(tokenFor('MY_TOKEN', { HOME: scratchDir('heads-nohome-') }), null);
});

test('isGitHub is true for an https GitHub URL only, and failed() reads an error object', () => {
  assert.equal(isGitHub('https://github.com/o/r.git'), true);
  assert.equal(isGitHub('https://x@github.com/o/r.git'), true);
  assert.equal(isGitHub('git@github.com:o/r.git'), false);
  assert.equal(isGitHub(null), false);
  assert.equal(failed({ error: 'x' }), true);
  assert.equal(failed({ error: 3 }), false);
  assert.equal(failed(null), false);
});

test('with no remote, the layout\'s repo names the URL; with neither there is nothing to compare', () => {
  const dir = scratchDir('heads-nogit-');
  assert.equal(urlOf(dir, {}, 'origin'), null);
  assert.equal(urlOf(dir, {}, 'origin', { repo: 'Own/name' }), 'https://github.com/Own/name.git');
  assert.equal(urlOf(dir, {}, 'origin', { repo: '/srv/r.git' }), '/srv/r.git');
  assert.deepEqual(remoteHeads(dir, {}, 'origin'), { url: null, error: 'no remote named origin' });
});

test('a branch with no upstream pushes to origin under its own name', () => {
  assert.deepEqual(target(scratchDir('heads-tgt-'), {}, 'work/x'), { remote: 'origin', name: 'work/x' });
});

// WB-223 in supernova2_monitor, seen twice on 2026-11-25: a commit pushed by URL (the token form) moves no local tracking ref, and a
// push from another repo (`cd ~/projects/claude-packs && git push <URL>`) was marked seen in the project's repo only, so the next
// offline look of the pushing repo counted a commit GitHub held as unpushed (KWB-233).
test('a push marked seen in the repo it ran in sends the next offline look of that repo live (KWB-233)', () => {
  const remote = scratchDir('heads-remote-');
  const dir = scratchDir('heads-clone-');
  const git = (cwd: string, ...args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  git(remote, 'init', '-q', '--bare');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 't@t');
  git(dir, 'config', 'user.name', 't');
  git(dir, 'remote', 'add', 'origin', remote);
  put(join(dir, 'a.txt'), 'a\n');
  git(dir, 'add', 'a.txt');
  git(dir, 'commit', '-q', '-m', 'one');
  git(dir, 'push', '-q', 'origin', 'main');
  assert.ok(!failed(remoteHeads(dir, {}, 'origin', { live: true })), 'the kept look is taken');
  put(join(dir, 'a.txt'), 'b\n');
  git(dir, 'commit', '-q', '-am', 'two');
  git(dir, 'push', '-q', remote, 'main');
  const head = git(dir, 'rev-parse', 'HEAD');
  assert.notEqual(git(dir, 'rev-parse', 'origin/main'), head, 'the tracking ref is stale, as after a push by URL');
  const judge = (h: { heads: ReadonlyMap<string, string> }): string | null => ([...h.heads.values()].includes(head) ? null : 'unpushed');
  assert.equal(withHeads(dir, {}, 'origin', { offline: true }, judge), 'unpushed', 'unmarked, the offline look is stale');
  pushSeen(dir, {}, Date.now() + 1000);
  assert.equal(withHeads(dir, {}, 'origin', { offline: true }, judge), null, 'marked, it is taken live: GitHub holds it');
  assert.deepEqual(pushDirs(`cd ${dir} && source ~/.env && git push -q ${remote} main`, '/elsewhere'), [dir]);
  assert.deepEqual(pushDirs(`git -C ${dir} push -q origin main; git status`, '/elsewhere'), [dir]);
  assert.deepEqual(pushDirs("echo 'git push' && git status", dir), [], 'a quoted push is no push');
});

test('a planted unreachable remote is a failure, never a throw, and the judge is not run', () => {
  const dir = scratchDir('heads-bad-');
  let judged = 0;
  const r = withHeads(dir, {}, 'origin', {}, () => { judged += 1; return 'x'; });
  assert.ok(failed(r));
  assert.match(r.error, /could not be reached \(no remote named origin\)/);
  assert.equal(judged, 0);
});
