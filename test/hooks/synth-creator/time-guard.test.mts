// time-guard: a wait that can never end is refused, a probe that cannot match itself passes. The hook's contract, then the refusals that
// sat in the old root test files.
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'time-guard.mjs',
  dir: () => fixture('synth-creator'),
  same: () => ({
    payload: { hook_event_name: 'PreToolUse', ...bash('until ! pgrep -f "cmake --build"; do sleep 5; done') },
    status: 2,
  }),
});
