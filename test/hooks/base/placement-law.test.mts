// placement-law: each kind of thing goes in its one folder. The hook's contract, then its refusals.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'placement-law.mjs',
  dir: () => fixture('audio-core+gpu-painter'),
  same: (project) => ({ payload: write(join(project, 'src/core/glow.wgsl'), '@fragment fn fs() {}'), status: 2 }),
});
