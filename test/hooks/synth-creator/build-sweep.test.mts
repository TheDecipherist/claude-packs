// build-sweep (opt-in): an agent worktree's quiet build output is removed; a session start refuses nothing. The hook's contract, then the
// refusals that sat in the old root test files.
import { enabledFixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'build-sweep.mjs',
  dir: () => enabledFixture('build-sweep', 'synth-creator', 'hooks/build-sweep.mjs'),
  same: (project) => ({ payload: { hook_event_name: 'SessionStart', cwd: project }, status: 0 }),
});
