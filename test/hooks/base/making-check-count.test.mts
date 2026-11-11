// making-check-count: the Stop that counts what a turn wrote for making-check. The hook's contract, then its refusals.
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'making-check-count.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { hook_event_name: 'Stop', cwd: project, session_id: 'same-verdict' }, status: 0 }),
});
