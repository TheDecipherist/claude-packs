// 1.1.0, group 3 (KF-1, KF-9): the doctor's answers on a new project. Split from kf-new-projects.test.mts because each doctor run
// proves every installed hook, so these together take a file's minute alone; shared out again over kf-new-projects-doctor-queue and
// kf-new-projects-doctor-strict so no file sums over a minute.
import { assert, cli, test } from '../kit-cli.mts';
import { withLayout } from '../fixtures/installs.mts';
import { putIn, unit } from './new-project-rig.mts';

test('KF-1: doctor is red for a wrapper that queues nothing', () => {   // was: "KF-1: doctor is red when the queue is gone, and for a wrapper that queues nothing" (its second half: kf-new-projects-doctor-queue)
  const dir = unit();
  const says = (): string => cli(dir, 'doctor').stdout;
  assert.doesNotMatch(says(), /queue/i);
  withLayout(dir, { commands: { build: 'tools/build.sh build' } });
  putIn(dir, 'tools/build.sh', '#!/bin/sh\ncmake --build out\n');
  assert.match(says(), /tools\/build\.sh does not call the queue/);
  putIn(dir, 'tools/build.sh', '#!/bin/sh\nnode .claude/tools/buildq.mjs cmake --build out\n');
  assert.doesNotMatch(says(), /does not call the queue/);
});
