// 0.10.1: a hover gate declined with a reason, a project with no UI code yet, and a node web project (split from gpu-painter-pack.test.mts so
// no file sums over a minute).
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { withLayout } from '../../fixtures/installs.mts';
import { assert, cli, test } from '../../kit-cli.mts';
import { repoOf, synthWithUi } from './gpu-painter-rig.mts';

test('doctor: a declined hover gate needs its reason, and a fresh project with no UI code is not a PROBLEM', () => {   // the rest of "doctor: UI code and no hover gate is a PROBLEM; the gate named (and its file there) is OK; a fresh project with no UI code is not"
  const dir = synthWithUi();
  withLayout(dir, { gates: { hover: 'none: a library with no pointer' } });
  assert.equal(cli(dir, 'doctor').status, 0, 'an explicit decline with its reason');
  withLayout(dir, { gates: { hover: 'none:' } });
  assert.equal(cli(dir, 'doctor').status, 1, 'a decline with no reason is not one');
  const fresh1 = repoOf('synth');
  const strict = cli(fresh1, 'doctor', '--strict');
  assert.equal(strict.status, 0, `no UI code yet: ${strict.stdout}`);
});

test('doctor: a node web project with UI code and no hover gate is a PROBLEM too (ui-craft)', () => {
  const dir = repoOf('next-app');
  put(join(dir, 'src/ui/Page.tsx'), 'export const Page = () => <main />;\n');
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1, red.stdout);
  assert.match(red.stdout, /PROBLEM: no hover gate declared/);
  assert.match(red.stdout, /hover-state skill/);
});
