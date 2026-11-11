// folder-law: a new source file outside the layout is refused. The hook's contract (its selftest, its worktree case, the emitted
// verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'folder-law.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: write(join(project, 'random/stray.cpp')), status: 2 }),
});
