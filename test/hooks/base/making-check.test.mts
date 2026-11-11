// making-check: a turn that wrote code must carry its making line, or the Stop is sent back. The hook's contract, then its refusals.
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'making-check.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { hook_event_name: 'Stop', cwd: project, session_id: 'same-verdict' }, status: 0 }),
});
