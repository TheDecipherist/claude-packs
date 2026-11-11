// The ui-craft pack's doctor gate, with no hook of its own (0.17.0): doctor is red for UI code with no page gate, and green with one
// or with a reason. Three doctors, so this file is kept apart from the cheap reads in ui-craft-pack.test.mts.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { withLayout } from '../../fixtures/installs.mts';
import { cli } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

test('doctor is red for UI code with no page gate, and green with one or with a reason', () => {
  const dir = fixture('next-app');
  assert.equal(cli(dir, 'doctor').status, 0, 'no UI code yet: nothing to prove');
  put(join(dir, 'src/ui/Page.tsx'), 'export const Page = () => <main />;\n');
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1);
  assert.match(red.stdout, /no a11y gate declared/);
  assert.match(red.stdout, /prove-page/);
  withLayout(dir, { gates: { a11y: 'none: a throwaway prototype', hover: 'none: a throwaway prototype' } });
  assert.equal(cli(dir, 'doctor').status, 0);
  withLayout(dir, { gates: { a11y: 'node tools/page-gate.mjs', hover: 'none: a throwaway prototype' } });
  assert.match(cli(dir, 'doctor').stdout, /tools\/page-gate\.mjs, which is not there/);
});
