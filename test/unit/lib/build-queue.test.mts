// lib/build-queue.mts: the two ways a project's build queue fails open (KF-1).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildQueueProblems } from '../../../lib/build-queue.mjs';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { plantedGuards } from '../../kit-cli.mts';

const withGuard = (): string => {
  const dir = scratchDir('buildq-');
  put(join(dir, '.claude/hooks/build-guard.mjs'), '');
  return dir;
};

test('a project without build-guard has nothing to check', () => {
  assert.deepEqual(buildQueueProblems(scratchDir('buildq-none-'), { folders: {}, concepts: {} }), []);
});

test('a missing queue tool is named, and a build.sh that never calls it is named', () => {
  const dir = withGuard();
  put(join(dir, 'build.sh'), 'make');
  const problems = buildQueueProblems(dir, { folders: {}, concepts: {}, commands: { build: './build.sh --all' } });
  assert.equal(problems.length, 2);
  assert.match(problems[0] ?? '', /buildq\.mjs, which is missing/);
  assert.match(problems[1] ?? '', /^\.\/build\.sh does not call the queue/);
});

test('a wrapper that calls buildq passes, and one that declares "none: <reason>" is left alone', () => {
  const dir = withGuard();
  put(join(dir, '.claude/tools/buildq.mjs'), '');
  put(join(dir, 'build.sh'), '.claude/tools/buildq.mjs make');
  const layout = { folders: {}, concepts: {}, commands: { build: 'build.sh' } };
  assert.deepEqual(buildQueueProblems(dir, layout), []);
  put(join(dir, 'build.sh'), 'make');
  assert.equal(buildQueueProblems(dir, layout).length, 1);
  assert.deepEqual(buildQueueProblems(dir, { ...layout, guards: { build: { queue: 'none: it queues itself' } } }), []);
  assert.equal(buildQueueProblems(dir, { ...layout, guards: plantedGuards({ build: { queue: 7 } }) }).length, 1, 'a queue that is no text is not a declaration');
});
