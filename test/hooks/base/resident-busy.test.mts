// resident/event busyNext: a busy window (the machine past the governor's budget) closes only after the load has stayed under it for
// BUSY_CALM_MS. It closed on one dip of the 1-minute load under the slots while the 5-minute load was near 30, and the pool's waits in
// the five minutes before it opened again (45 ms, every hook of the event slowed together) were charged to the pool (supernova2_monitor
// stage 6, before W6.2, KWB-next).
import { BUSY_CALM_MS, busyNext } from '../../../packs/base/hooks/resident/event.mts';
import { assert, test } from '../../kit-cli.mts';

test('a dip under the budget keeps the window open; a calm of BUSY_CALM_MS closes it; a rise in the calm starts the calm again', () => {
  let s = busyNext({ busy: false, calmSince: null }, 40, 10, 0);
  assert.equal(s.busy, true, 'past the budget: busy');
  s = busyNext(s, 9, 10, 1000);
  assert.equal(s.busy, true, 'one dip: still busy');
  s = busyNext(s, 30, 10, 60_000);
  s = busyNext(s, 8, 10, 120_000);
  s = busyNext(s, 8, 10, 120_000 + BUSY_CALM_MS - 1);
  assert.equal(s.busy, true, 'the calm restarted at the rise: not yet');
  s = busyNext(s, 8, 10, 120_000 + BUSY_CALM_MS);
  assert.equal(s.busy, false, 'calm for BUSY_CALM_MS: the window closes');
  assert.equal(busyNext({ busy: false, calmSince: null }, 5, 10, 0).busy, false, 'a quiet machine is never busy');
});
