// stage-guard: `git add -A` and its kin are refused; staging a named file is not. The hook's contract, then the refusals that sat in the
// old root test files.
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'stage-guard.mjs',
  dir: () => fixture('synth-creator'),
  same: (project) => ({ payload: bash('git add -A', project), status: 2 }),
});
