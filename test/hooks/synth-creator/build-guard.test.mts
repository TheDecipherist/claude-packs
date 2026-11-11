// build-guard: a build outside the queue is refused, through the queue it passes. The hook's contract, then the refusals that sat in the
// old root test files.
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'build-guard.mjs',
  dir: () => fixture('synth-creator'),
  same: () => ({ payload: bash('cmake --build build -j8'), status: 2 }),
});
