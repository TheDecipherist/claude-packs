// command-prefix.mts: the command a shell line really runs, past the wrappers and assignments in front of it (KWB-101).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bareWords } from '../../../packs/base/hooks/lib/command-prefix.mts';

test('assignments and each wrapper, with the options that take a value, are stepped past', () => {
  assert.deepEqual(bareWords(['git', 'push']), ['git', 'push']);
  assert.deepEqual(bareWords(['A=1', 'B=2', 'git', 'push']), ['git', 'push']);
  assert.deepEqual(bareWords(['timeout', '100', 'git', 'push', '-u']), ['git', 'push', '-u']);
  assert.deepEqual(bareWords(['timeout', '-k', '5', '100', 'git', 'push']), ['git', 'push']);
  assert.deepEqual(bareWords(['sudo', '-u', 'me', 'git', 'push']), ['git', 'push']);
  assert.deepEqual(bareWords(['nice', '-n', '5', 'make']), ['make']);
  assert.deepEqual(bareWords(['stdbuf', '-oL', 'git', 'log']), ['git', 'log']);
  assert.deepEqual(bareWords(['env', 'X=1', 'Y=2', 'git', 'add']), ['git', 'add']);
});

test('wrappers nest, and a wrapper with nothing after it leaves no words', () => {
  assert.deepEqual(bareWords(['nohup', 'timeout', '9', 'env', 'T=1', 'git', 'push']), ['git', 'push']);
  assert.deepEqual(bareWords(['sudo']), []);
  assert.deepEqual(bareWords([]), []);
});

test('a word that only looks like a wrapper or an assignment is the command: a planted wrong input', () => {
  assert.deepEqual(bareWords(['timeouts', '1', 'x']), ['timeouts', '1', 'x']);
  assert.deepEqual(bareWords(['=x', 'git']), ['=x', 'git']);
  assert.deepEqual(bareWords(['echo', 'sudo', 'git']), ['echo', 'sudo', 'git'], 'only the leading words are stripped');
});
