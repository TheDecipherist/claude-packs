// 1.1.0, group 3 (KF-9): doctor --strict on a new project (split from kf-new-projects-doctor.test.mts so no file sums over a minute).
import { assert, cli, test } from '../kit-cli.mts';
import { withLayout } from '../fixtures/installs.mts';
import { putIn, unit } from './new-project-rig.mts';

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
