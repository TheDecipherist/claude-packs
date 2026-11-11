// push-form.mts: the push a refusal offers, over SSH as itself and over HTTPS with the token named, never stored.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NEVER_DELETE, pushCommand, sshOwner, unpushedMessage } from '../../../packs/base/hooks/lib/push-form.mts';

test('sshOwner names the owner of an SSH GitHub URL, and nothing for another form', () => {
  assert.equal(sshOwner('git@github.com:Own/repo.git'), 'Own');
  assert.equal(sshOwner('git@github-work:Own/repo'), 'Own');
  assert.equal(sshOwner('ssh://git@github.com/Own/repo.git'), 'Own');
  assert.equal(sshOwner('https://github.com/Own/repo.git'), null);
  assert.equal(sshOwner(null), null);
});

test('an SSH remote is pushed as itself; an HTTPS one with the token variable named', () => {
  assert.equal(pushCommand('git@github.com:Own/repo.git', ['b1', 'b2']), 'git push git@github.com:Own/repo.git b1 b2');
  const cmd = pushCommand('https://github.com/Own/repo.git', ['b1'], { tokenVar: 'GH_TOKEN' });
  assert.equal(cmd, 'source ~/.env && git push https://x-access-token:$GH_TOKEN@github.com/Own/repo.git b1');
  assert.match(pushCommand('git@github.com:Other/repo.git', ['b'], { owner: 'Own' }), /x-access-token:\$PERSONAL_GITHUB_TOKEN@github\.com\/Other\/repo\.git/, 'an SSH key of another owner goes by token');
});

test('a planted URL that is not GitHub still gives a command with a placeholder owner', () => {
  assert.match(pushCommand('/srv/repo.git', ['b']), /<owner>\/repo\.git b$/);
});

test('the refusal lists the commits, caps them at eight and says never to delete', () => {
  const commits = Array.from({ length: 10 }, (_, i) => ({ sha: `s${i}`, subject: `c${i}` }));
  const msg = unpushedMessage({ branch: 'work/x', remote: 'origin', url: 'git@github.com:Own/r.git', commits });
  assert.match(msg, /work\/x has 10 commit\(s\)/);
  assert.match(msg, /\.\.\. 2 more/);
  assert.ok(!msg.includes('s9 c9'));
  assert.ok(msg.endsWith(NEVER_DELETE));
});
