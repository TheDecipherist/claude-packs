// 0.10.1: doctor goes red when a project has UI code and declares no hover gate (split from gpu-painter-pack.test.mts so no file sums over a minute).
import { join } from 'node:path';
import { withLayout } from '../../fixtures/installs.mts';
import { assert, cli, mkdirSync, test, writeFileSync } from '../../kit-cli.mts';
import { repoOf, synthWithUi } from './gpu-painter-rig.mts';

test('doctor: UI code and no hover gate is a PROBLEM; the gate named (and its file there) is OK', () => {   // was "...; the gate named (and its file there) is OK; a fresh project with no UI code is not" (the rest: gpu-painter-pack-declined.test.mts)
  const dir = synthWithUi();
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1, red.stdout);
  assert.match(red.stdout, /PROBLEM: .*hover gate/);
  withLayout(dir, { gates: { hover: 'bash tools/gates/hover_gate.sh' } });
  const missing = cli(dir, 'doctor');
  assert.equal(missing.status, 1, 'the command names a file that is not there');
  assert.match(missing.stdout, /PROBLEM: .*tools\/gates\/hover_gate\.sh/);
  mkdirSync(join(dir, 'tools/gates'), { recursive: true });
  writeFileSync(join(dir, 'tools/gates/hover_gate.sh'), '#!/usr/bin/env bash\nexit 0\n');
  const green = cli(dir, 'doctor');
  assert.equal(green.status, 0, green.stdout);
  assert.doesNotMatch(green.stdout, /hover gate/);
});

test('doctor: the web app (packages/web) with a page and no hover gate is a PROBLEM too', () => {
  const dir = repoOf('full-stack');
  writeFileSync(join(dir, 'packages/web/app/page.tsx'), 'export default function P() { return null; }\n');
  const red = cli(dir, 'doctor');
  assert.equal(red.status, 1, red.stdout);
  assert.match(red.stdout, /PROBLEM: .*hover gate/);
});
