// once-only: a write that repeats code the repo already has is refused. The hook's contract, then its refusals.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'once-only.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: write(join(project, 'src/core/Rec.cpp')), status: 0 }),
});
