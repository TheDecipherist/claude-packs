// no-polling: a sleep loop that waits on a job is refused in a base install (KWB-204). The hook's contract, then the refusals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { pollingIn } from '../../../packs/base/hooks/lib/polling.mts';

holdsTheContract({
  hook: 'no-polling.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: bash("until grep -q done build/log; do sleep 10; done", project), status: 2 }),
});

test('the sleep loops are found, the quiet twins are not', () => {
  assert.ok(pollingIn('while true; do\n  sleep 15\ndone'));
  assert.ok(pollingIn('sleep 180'));
  assert.equal(pollingIn('sleep 2 && ls'), null);
  assert.equal(pollingIn('for f in a b; do echo "$f"; done'), null);
  assert.equal(pollingIn("cat > f.sh <<'EOF'\nwhile true; do sleep 9; done\nEOF"), null);
  assert.equal(pollingIn('tail --pid=12345 -f /dev/null'), null);   // KWB-210: a wait on a process
  assert.ok(pollingIn('tail --pid=12345 -f build/x.log'));
  assert.ok(pollingIn('timeout 590 tail -n +1 -f build/gate.txt'));   // KWB-213: a value before -f is still tail -f
  assert.equal(pollingIn('tail -n 20 build/x.log | grep -f pats.txt'), null);   // grep's -f is not tail's
});
