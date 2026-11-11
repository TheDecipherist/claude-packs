// code-shape: a statement count, a line width and a parameter count that a function may not pass. The hook's contract (its selftest,
// its worktree case, the emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'code-shape.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: write(join(project, 'src/app/packed.h'), 'void p() { a(); b(); c(); d(); }\n'), status: 2 }),
});
