// cpu-gate: a branch that changed audio code lands only with a fresh CPU report within the budget (KWB-264). The hook's
// contract, then the report's faults, judged directly.
import assert from 'node:assert/strict';
import { faultOf, gateOf } from '../../../packs/audio-core/hooks/lib/cpu-report.mts';
import { bash } from '../../fixtures/installs.mts';
import { test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'cpu-gate.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: { hook_event_name: 'PreToolUse', ...bash('git status', project) }, status: 0 }),
});

const LAYOUT = { folders: { audio: { path: 'src/audio' }, engines: { path: 'src/engines/' }, app: { path: 'src/app' } }, concepts: {} };

test('cpu-gate: the gate defaults to the audio folders the layout has, and a project names its own', () => {
  assert.deepEqual(gateOf(LAYOUT), { code: ['src/audio/**', 'src/engines/**'], report: 'build/evidence/cpu.json', budget: 0.5 });
  assert.deepEqual(gateOf({ ...LAYOUT, cpu: { code: ['src/voice/**'], budget: 0.4 } }).code, ['src/voice/**']);
  assert.equal(gateOf({ ...LAYOUT, cpu: { budget: 0.4 } }).budget, 0.4);
});

test('cpu-gate: one core over the budget names the worker pool; within it passes; a stale key or no worst refuses', () => {
  const gate = gateOf(LAYOUT);
  assert.match(faultOf({ code: 'k', verdict: 'fail', worst: 0.92, threads: 1 }, gate, 'k') ?? '', /92 % of its deadline on one core.*spread-voices-over-cores/);
  assert.match(faultOf({ code: 'k', verdict: 'fail', worst: 0.61, threads: 4 }, gate, 'k') ?? '', /with 4 threads/);
  assert.equal(faultOf({ code: 'k', verdict: 'pass', worst: 0.31, threads: 4 }, gate, 'k'), null);
  assert.match(faultOf({ code: 'old', verdict: 'pass', worst: 0.31 }, gate, 'k') ?? '', /measure again/);
  assert.match(faultOf({ code: 'k', verdict: 'pass' }, gate, 'k') ?? '', /no "worst"/);
  assert.match(faultOf({ code: 'k', verdict: 'fail', worst: 0.31 }, gate, 'k') ?? '', /says "fail"/);
});
