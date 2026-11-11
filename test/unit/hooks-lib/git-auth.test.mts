// git-auth.mts: how a push and a `gh` call prove who they act as (KF-12): a named token, or this machine's own login.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NEW_INSTALL_GIT, ghLaw, pushLaw } from '../../../packs/base/hooks/lib/git-auth.mts';

test('a new install uses the machine\'s own login', () => {
  assert.deepEqual(NEW_INSTALL_GIT, { house: true, ghAuth: 'cli', trunkNeedsYes: true });
});

test('a push over SSH to the owner\'s repo needs no token; a push with no owner has no repo to hold it to', () => {
  const c = { owner: 'Me', ghAuth: 'token' as const };
  assert.equal(pushLaw('git push origin main', 'git@github.com:Me/r.git', c), null);
  assert.equal(pushLaw('git push origin main', 'https://x', { ghAuth: 'token' }), null);
});

test('an HTTPS push must name the owner\'s repo, and with a token login name the token variable, never a pasted one', () => {
  const c = { owner: 'Me', ghAuth: 'token' as const, accountNote: 'NOTE' };
  assert.match(pushLaw('git push origin main', 'https://github.com/Me/r.git', c) ?? '', /must name the repo.*NOTE/);
  assert.equal(pushLaw('git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/Me/r.git main', null, c), null);
  assert.match(pushLaw('git push https://x-access-token:ghp_abc@github.com/Me/r.git main', null, c) ?? '', /names the token as \$PERSONAL_GITHUB_TOKEN/);
  assert.equal(pushLaw('git push https://x@github.com/Me/r.git main', null, { ...c, ghAuth: 'cli' }), null, 'the machine\'s login needs no token');
  assert.equal(pushLaw('git push https://x:${GT}@github.com/Me/r.git main', null, { ...c, tokenVar: 'GT' }), null);
});

test('an SSH remote of another owner is held to the repo-naming law: planted wrong input', () => {
  assert.match(pushLaw('git push origin main', 'git@github.com:Other/r.git', { owner: 'Me' }) ?? '', /must name the repo/);
});

test('gh with a token login must name the token and have it set; a cli login or a non-gh command is free', () => {
  const token = { ghAuth: 'token' as const, accountNote: 'NOTE' };
  const none = (): string => '';
  assert.equal(ghLaw('gh pr list', 'gh pr list', { ghAuth: 'cli' }, {}, none), null);
  assert.equal(ghLaw('git push', 'git push', token, {}, none), null);
  assert.match(ghLaw('gh pr list', 'gh pr list', token, {}, none) ?? '', /Every `gh` names the token.*NOTE/);
  assert.equal(ghLaw('GH_TOKEN=$PERSONAL_GITHUB_TOKEN gh pr list', 'gh pr list', token, { PERSONAL_GITHUB_TOKEN: 't' }, none), null);
  assert.equal(ghLaw('source ~/.env && GH_TOKEN=$PERSONAL_GITHUB_TOKEN gh x', 'gh x', token, {}, none), null, 'a source may set it');
  assert.match(ghLaw('GH_TOKEN=$PERSONAL_GITHUB_TOKEN gh x', 'gh x', token, {}, () => 'tim') ?? '', /is not set here.*gh is logged in as tim/);
});
