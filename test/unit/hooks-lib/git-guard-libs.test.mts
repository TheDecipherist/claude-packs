// push-form.mts, git-auth.mts, remote-heads.mts, trunk-lag.mts: git-guard's pushed laws, on the caller's env (W3 L4).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { ghLaw, pushLaw } from '../../../packs/base/hooks/lib/git-auth.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { gitRun } from '../../../packs/base/hooks/lib/git-run.mts';
import { pushCommand, sshOwner } from '../../../packs/base/hooks/lib/push-form.mts';
import { remoteHeads, tokenFor } from '../../../packs/base/hooks/lib/remote-heads.mts';
import { stopVerdict } from '../../../packs/base/hooks/lib/stop-verdict.mts';
import { trunkLag } from '../../../packs/base/hooks/lib/trunk-lag.mts';

test('sshOwner and pushCommand: an SSH remote is pushed as itself, else the token form names the variable', () => {
  assert.equal(sshOwner('git@github-house:Owner/app.git'), 'Owner');
  assert.equal(sshOwner('https://github.com/Owner/app.git'), null);
  assert.equal(pushCommand('git@github.com:Any/app.git', ['b'], { owner: 'Any' }), 'git push git@github.com:Any/app.git b');
  assert.equal(pushCommand('https://github.com/Owner/app.git', ['a', 'b']), 'source ~/.env && git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/Owner/app.git a b');
});

test('pushLaw: a push to another owner is refused; the escape keeps a dot in an owner literal', () => {
  const c = { owner: 'a.b', tokenVar: 'T', accountNote: 'note' };
  assert.match(pushLaw('git push https://x-access-token:$T@github.com/other/app.git x', null, c) ?? '', /must name the repo/);
  assert.match(pushLaw('git push https://x-access-token:$T@github.com/aXb/app.git x', null, c) ?? '', /must name the repo/);
  assert.equal(pushLaw('git push https://x-access-token:$T@github.com/a.b/app.git x', null, c), null);
});

test('ghLaw reads the token variable from the env it is given, never the process\'s', () => {
  const c = { ghAuth: 'token' as const, tokenVar: 'TOK', accountNote: '' };
  const cmd = 'GH_TOKEN=$TOK gh repo view';
  assert.equal(ghLaw(cmd, cmd, c, { TOK: 'x' }, () => 'me'), null);
  assert.match(ghLaw(cmd, cmd, c, {}, () => 'me') ?? '', /is not set here.*gh is logged in as me/);
  assert.equal(ghLaw(cmd, cmd, { ...c, ghAuth: 'cli' }, {}, () => 'me'), null);
});

test('tokenFor: the env first, then ~/.env of the HOME it names', () => {
  const home = scratchDir('git-guard-home-');
  put(join(home, '.env'), "export TOK='from-file'\n");
  assert.equal(tokenFor('TOK', { HOME: home, TOK: 'from-env' }), 'from-env');
  assert.equal(tokenFor('TOK', { HOME: home }), 'from-file');
  assert.equal(tokenFor('NOPE', { HOME: home }), null);
});

function hub(): { dir: string; env: Record<string, string>; git: (cwd: string, ...a: string[]) => void } {
  const top = scratchDir('git-guard-libs-');
  const env = { PATH: process.env['PATH'] ?? '', HOME: top, GIT_CONFIG_NOSYSTEM: '1' };
  const git = (cwd: string, ...a: string[]): void => { gitRun(a, { cwd, env, identity: { name: 'u', email: 'u@l' } }); };
  const dir = join(top, 'repo');
  git(top, 'init', '-q', '--bare', '-b', 'main', join(top, 'hub.git'));
  git(top, 'init', '-q', '-b', 'main', dir);
  git(dir, 'remote', 'add', 'origin', join(top, 'hub.git'));
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'a');
  git(dir, 'push', '-q', 'origin', 'main');
  return { dir, env, git };
}

test('remoteHeads: a live look lists the heads and keeps them; the next look is the kept one; a gone remote is an error', () => {
  const { dir, env, git } = hub();
  const first = remoteHeads(dir, env, 'origin');
  assert.ok('heads' in first && !first.cached && first.heads.has('main'));
  const second = remoteHeads(dir, env, 'origin');
  assert.ok('heads' in second && second.cached);
  git(dir, 'remote', 'set-url', 'origin', join(dir, 'nowhere.git'));
  assert.ok('error' in remoteHeads(dir, env, 'origin', { live: true }));   // the planted wrong input: nothing there
  assert.equal(remoteHeads(dir, env, 'nope').url, null);
});

test('stopVerdict and trunkLag judge in the folder and env given: a pushed repo is clean, one commit ahead is refused', () => {
  const { dir, env, git } = hub();
  const stateDir = scratchDir('git-guard-state-');
  assert.equal(stopVerdict(dir, env, {}, 's1', { stateDir }).code, 0);
  git(dir, 'switch', '-q', '-c', 'work/x');
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'b');
  const v = stopVerdict(dir, env, {}, 's1', { stateDir });
  assert.equal(v.code, 2);
  assert.match(v.stderr ?? '', /work\/x/);
  assert.equal(trunkLag(dir, env, {}), null);
});
