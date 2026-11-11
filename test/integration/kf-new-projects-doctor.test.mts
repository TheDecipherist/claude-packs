// 1.1.0, group 3 (KF-1, KF-9): the doctor's answers on a new project. Split from kf-new-projects.test.mts because each doctor run
// proves every installed hook, so these three together take a file's minute alone.
import { assert, cli, join, rmSync, test, writeFileSync } from '../kit-cli.mts';
import { withLayout } from '../fixtures/installs.mts';
import { putIn, unit } from './new-project-rig.mts';

test('KF-1: doctor is red when the queue is gone, and for a wrapper that queues nothing', () => {
  const dir = unit();
  const says = (): string => cli(dir, 'doctor').stdout;
  assert.doesNotMatch(says(), /queue/i);
  withLayout(dir, { commands: { build: 'tools/build.sh build' } });
  putIn(dir, 'tools/build.sh', '#!/bin/sh\ncmake --build out\n');
  assert.match(says(), /tools\/build\.sh does not call the queue/);
  putIn(dir, 'tools/build.sh', '#!/bin/sh\nnode .claude/tools/buildq.mjs cmake --build out\n');
  assert.doesNotMatch(says(), /does not call the queue/);
  putIn(dir, 'tools/build.sh', '#!/bin/sh\ncmake --build out\n');
  withLayout(dir, { guards: { build: { queue: 'none: it holds two slots itself, through flock' } } });
  assert.doesNotMatch(says(), /does not call the queue/);
  rmSync(join(dir, '.claude/tools/buildq.mjs'));
  assert.match(says(), /build-guard sends every build to \.claude\/tools\/buildq\.mjs, which is missing/);
});

test('KF-9: doctor --strict passes on a new project, with no code and with its first file', () => {
  const dir = unit();
  assert.equal(cli(dir, 'doctor', '--strict').status, 0);
  putIn(dir, 'src/dsp/Filter.cpp', 'float gain = 1.0f;\n');
  const named = (cli(dir, 'doctor').stdout.match(/answers to: ([^\n]*)/)?.[1] ?? '').split(', ');
  withLayout(dir, { ruleTests: Object.fromEntries(named.map((r) => [r, 'none: the first file; its tests come with the next step'])) });
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 0, strict.stdout);
  assert.match(strict.stdout, /wait for their first file/);
});

test('KF-9: a rule whose folder holds files and none it matches is still dead', () => {
  const dir = unit();
  const f = join(dir, '.claude/rules/my-rule.md');
  writeFileSync(f, '---\npaths:\n  - "src/dsp/**/*.wgsl"\n---\n\n# x\n');
  putIn(dir, 'src/dsp/Filter.cpp', 'float gain = 1.0f;\n');
  assert.match(cli(dir, 'doctor', '--strict').stdout, /match no file yet, so they never fire: [^\n]*my-rule\.md/);
});
