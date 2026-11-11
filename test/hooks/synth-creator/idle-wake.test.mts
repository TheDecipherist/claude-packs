// idle-wake (opt-in): a turn that ends with work named and not started is woken. The hook's contract, then the refusals that sat in the
// old root test files.
import { join } from 'node:path';
import { assert, put } from '../../kit-cli.mts';
import { fireAs } from '../../worktree-rig.mts';
import { enabledFixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';

// idle-wake reads the asks user-asks keeps, so both are enabled
const withHook = (): string => enabledFixture('idle-wake', 'synth-creator', 'hooks/idle-wake.mjs', 'hooks/user-asks.mjs');

holdsTheContract({
  hook: 'idle-wake.mjs',
  dir: withHook,
  same: (project) => {
    const transcript = join(project, 'transcript.jsonl');
    put(transcript, '{}\n');
    return { payload: { hook_event_name: 'Stop', transcript_path: transcript, last_assistant_message: 'All done. NOTHING OPEN' }, status: 0 };
  },
  // the hook's own case, then the timed wake: the wake is timed, so its case needs the environment
  worktree: async (checkouts: Checkouts) => {
    const { here, wt } = checkouts;
    await installedWorktreeCase(checkouts, 'idle-wake.mjs');
    const transcript = join(wt, 'transcript.jsonl');
    put(transcript, '{}\n');
    const env = { IDLE_WAKE_MIN: '0.0005', IDLE_WAKE_LOOK_S: '0.01', TIMS_ASKS_LEDGER: join(wt, 'ledger.json') };
    const stop = fireAs(here, 'idle-wake.mjs', { hook_event_name: 'Stop', transcript_path: transcript, last_assistant_message: 'Next I would build P4.' }, env);
    assert.equal(stop.status, 2);
  },
});
