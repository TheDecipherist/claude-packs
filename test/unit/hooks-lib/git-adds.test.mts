// git-adds.mts: the `git add` calls in a shell command, with the folder each runs in; a dry run stages nothing (KF-10).
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { gitAdds } from '../../../packs/base/hooks/lib/git-adds.mts';

test('each git add in a chain is found with its arguments and the folder it runs in', () => {
  assert.deepEqual(gitAdds('git add a.txt b.txt && git commit -m x', '/p'), [{ dir: '/p', args: ['a.txt', 'b.txt'] }]);
  assert.deepEqual(gitAdds('git add a; git add -- b', '/p').map((a) => a.args), [['a'], ['--', 'b']]);
});

test('-C moves the folder, -c does not, and both are stepped past', () => {
  assert.deepEqual(gitAdds('git -C sub add x', '/p'), [{ dir: resolve('/p', 'sub'), args: ['x'] }]);
  assert.deepEqual(gitAdds('git -c core.x=1 add x', '/p'), [{ dir: '/p', args: ['x'] }]);
});

test('a dry run, another git command and an add inside a heredoc stage nothing: planted wrong input', () => {
  assert.deepEqual(gitAdds('git add -n x', '/p'), []);
  assert.deepEqual(gitAdds('git add --dry-run x', '/p'), []);
  assert.deepEqual(gitAdds('git status && git commit -m x', '/p'), []);
  assert.deepEqual(gitAdds('echo git add x', '/p'), []);
  assert.deepEqual(gitAdds('cat <<EOF\ngit add secret\nEOF', '/p'), []);
});
