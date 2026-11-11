// 1.1.0, group 3 (KF-1, KF-9): the doctor's answers on a new project, the queue gone and a rule that is dead (split from
// kf-new-projects-doctor.test.mts so no file sums over a minute).
import { assert, cli, join, rmSync, test, writeFileSync } from '../kit-cli.mts';
import { withLayout } from '../fixtures/installs.mts';
import { putIn, unit } from './new-project-rig.mts';

test('KF-1: a wrapper that says it queues elsewhere is not red, and doctor is red when the queue is gone', () => {   // the second half of "KF-1: doctor is red when the queue is gone, and for a wrapper that queues nothing"
  const dir = unit();
  const says = (): string => cli(dir, 'doctor').stdout;
  withLayout(dir, { commands: { build: 'tools/build.sh build' } });
  putIn(dir, 'tools/build.sh', '#!/bin/sh\ncmake --build out\n');
  withLayout(dir, { guards: { build: { queue: 'none: it holds two slots itself, through flock' } } });
  assert.doesNotMatch(says(), /does not call the queue/);
  rmSync(join(dir, '.claude/tools/buildq.mjs'));
  assert.match(says(), /build-guard sends every build to \.claude\/tools\/buildq\.mjs, which is missing/);
});

test('KF-9: a rule whose folder holds files and none it matches is still dead', () => {
  const dir = unit();
  const f = join(dir, '.claude/rules/my-rule.md');
  writeFileSync(f, '---\npaths:\n  - "src/dsp/**/*.wgsl"\n---\n\n# x\n');
  putIn(dir, 'src/dsp/Filter.cpp', 'float gain = 1.0f;\n');
  assert.match(cli(dir, 'doctor', '--strict').stdout, /match no file yet, so they never fire: [^\n]*my-rule\.md/);
});
