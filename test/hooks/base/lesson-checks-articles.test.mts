// lesson-checks on published text (split from lesson-checks.test.mts so no file sums over a minute). 0.27.0: published text is read by the
// writing laws, and left alone by the code laws, at the write and in a scan.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { assert, lessonWrite, test } from '../../kit-cli.mts';
import { enable, extraFixture, fixture } from '../hook-rig.mts';

test('a date in an article is a fact: the check is opt-in, and even switched on leaves articles alone', () => {
  const dir = fixture('base');
  assert.ok(!existsSync(join(dir, '.claude/checks/no-time-or-date.json')), 'held back');
  assert.equal(lessonWrite(dir, 'README.md', 'I built this last year.\n').status, 0);
  enable(dir, 'checks/no-time-or-date.json');
  assert.equal(lessonWrite(dir, 'README.md', 'I built this last year.\n').status, 2);
  assert.equal(lessonWrite(dir, 'articles/zodiac.md', 'The letter arrived in August 1969.\n').status, 0);
});

test('the writing laws still read an article; the code laws do not', () => {
  const dir = extraFixture('shell-js-ts-node', ['shell', 'js-ts', '--config', 'node']);
  assert.equal(lessonWrite(dir, 'articles/guide/a.md', 'It is fast — really.\n').status, 2);
  assert.equal(lessonWrite(dir, 'articles/guide/run.sh', 'now=`date`\n').status, 0);
  assert.equal(lessonWrite(dir, 'tools/run.sh', '#!/usr/bin/env bash\nset -euo pipefail\nnow=`date`\n').status, 2);
});
