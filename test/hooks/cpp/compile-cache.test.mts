// compile-cache: a build of a folder with no compiler cache is told how to get one. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'compile-cache.mjs',
  dir: () => fixture('cpp'),
  same: (project) => ({ payload: bash(`cmake --build ${join(project, 'fresh')} --target X`), status: 0 }),
});
