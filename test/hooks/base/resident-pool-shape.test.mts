// The daemon's pool shape (resident/options `poolShape`): every warm worker imports every hook at start and may hold any hook, so the
// judges of one event spread over all the warm workers instead of queuing on a hook's few holders while others idle (KWB-next, the pool
// verdict met at stage 3 of supernova2_monitor: worst event queue 15 to 27 ms with 1 of 4 preloaded, 4.0 to 4.2 with 6 of 6).
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { SPREAD, WARM, poolShape } from '../../../packs/base/hooks/resident/options.mts';
import { startPool } from '../../../packs/base/hooks/resident/pool.mts';
import { assert, test } from '../../kit-cli.mts';

const WORKER = new URL('../../../packs/base/hooks/resident/worker.mjs', import.meta.url);
const HOOKS = ['a', 'b', 'c', 'd', 'e', 'f'];

function hooksDir(): string {
  const dir = scratchDir('resident-shape-');
  // each judge takes 30 ms, as the light judges of a write do under load
  for (const name of HOOKS) put(join(dir, `${name}.mjs`), "export async function hook(event, ctx) {\n  await new Promise((d) => setTimeout(d, 30));\n  return { code: 0, stdout: '', stderr: '' };\n}\n");
  return dir;
}

test('the daemon\'s pool shape: every warm worker preloads every hook, and a hook may sit on every warm worker', () => {
  const shape = poolShape(WARM);
  assert.equal(shape.preload, WARM, `all ${WARM} warm workers import every hook at start, not ${shape.preload}`);
  assert.ok(shape.spread >= WARM, `a hook may be held by every warm worker: spread ${shape.spread} of ${WARM}`);
  assert.ok(WARM >= 5, `the warm pool is ${WARM}: 4 measured a worst event queue of 15 to 27 ms, 5 and up under 5 ms`);
  assert.equal(SPREAD, WARM, 'doctor\'s cold calls per hook (SPREAD) are one per warm worker');
  assert.deepEqual(poolShape(9), { warm: 9, preload: 9, spread: 9 }, 'a larger --warm preloads and spreads as far');
});

test('the daemon\'s pool shape: one event\'s judges run side by side on every warm worker, none waiting on a hook\'s holder', async () => {
  const pool = startPool({
    workerUrl: WORKER, data: { dir: hooksDir(), hooks: HOOKS, ext: '.mjs' }, ...poolShape(HOOKS.length), max: HOOKS.length,
    idleMs: 60_000, recycleAfter: 500, growAfterMs: 1000, candidates: () => [], log: () => undefined,
  });
  try {
    await pool.ready();
    assert.deepEqual(HOOKS.map((h) => pool.holders(h)), HOOKS.map(() => HOOKS.length), 'every worker holds every hook at start');
    const ctx = { projectDir: '/p', cwd: '/p', env: {}, sessionPid: 1, now: 0, layout: { folders: {}, concepts: {} } };
    // two events in turn, so the second finds hooks already placed by the first: none of its jobs may queue behind another
    for (let round = 0; round < 2; round += 1) {
      const done = await Promise.all(HOOKS.map((hook) => pool.run({ hook, event: { hook_event_name: 'PreToolUse' }, ctx })));
      assert.deepEqual(done.map((d) => d.code), HOOKS.map(() => 0), 'every judge ran and passed');
      assert.ok(Math.min(...done.map((d) => d.ms)) >= 25, 'each judge ran its 30 ms');
      const worst = Math.max(...done.map((d) => d.queue));
      assert.ok(worst < 20, `round ${round}: the worst job waited ${Math.round(worst)} ms for a worker, of six judges on six workers`);
    }
  } finally { await pool.close(); }
});
