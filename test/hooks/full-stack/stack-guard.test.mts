// stack-guard: the full-stack choices (no express, no vite) are held. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'stack-guard.mjs',
  dir: () => fixture('full-stack'),
  same: (project) => ({ payload: write(join(project, 'api/package.json'), '{"dependencies":{"express":"5.1.0"}}\n'), status: 2 }),
});
