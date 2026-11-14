// run-keeps-going: a session with nobody there ends its turn only on DONE, or after a stretch that recorded nothing (KWB-next:
// supernova2's sessions ended after one item each). An opt-in hook: its fixture enables it.
import { enabledFixture, holdsTheContract } from '../hook-rig.mts';
import { join } from 'node:path';
import { assert, hookRun, mkdirSync, test, writeFileSync } from '../../kit-cli.mts';

const dir = (): string => enabledFixture('run-keeps-going', 'base', 'hooks/run-keeps-going.mjs');
const order = (project: string, progress: string, done = false): string => {
  mkdirSync(join(project, 'docs/workorders/demo'), { recursive: true });
  writeFileSync(join(project, 'docs/workorders/demo/progress.md'), progress);
  if (done) writeFileSync(join(project, 'docs/workorders/demo/DONE'), 'done\n');
  return project;
};
const AWAY = { CLAUDE_PACKS_UNATTENDED: '1' };
const stop = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({ hook_event_name: 'Stop', session_id: 's1', ...extra });

holdsTheContract({ hook: 'run-keeps-going.mjs', dir, same: (project) => { order(project, '- W1.1 x\n'); return { payload: stop(), status: 2, env: AWAY }; } });

test('run-keeps-going: an open order with nobody there is sent back, naming the order', () => {
  const r = hookRun(order(dir(), '- W1.1 x\n'), 'run-keeps-going.mjs', stop(), AWAY);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /work order demo has no DONE/);
});

test('run-keeps-going: passes on DONE and with someone there', () => {
  assert.equal(hookRun(order(dir(), '- W1 done\n', true), 'run-keeps-going.mjs', stop(), AWAY).status, 0);
  assert.equal(hookRun(order(dir(), '- W1.1 x\n'), 'run-keeps-going.mjs', stop(), { CLAUDE_PACKS_UNATTENDED: '0' }).status, 0);
});

test('run-keeps-going: a wrap-up that records nothing is sent back again, an item resets the count, and three stalls in a row end it', () => {
  const project = order(dir(), '- W1.1 x\n');
  const run = (active: boolean): number | null => hookRun(project, 'run-keeps-going.mjs', stop(active ? { stop_hook_active: true } : {}), AWAY).status;
  assert.deepEqual([run(false), run(true), run(true)], [2, 2, 2]);
  order(project, '- W1.1 x\n- W1.2 y\n');
  assert.deepEqual([run(true), run(true), run(true), run(true)], [2, 2, 2, 0]);
});
