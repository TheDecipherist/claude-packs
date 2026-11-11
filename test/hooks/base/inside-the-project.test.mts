// inside-the-project: work for a project happens inside that project. The hook's contract (its selftest, its worktree case, the
// emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { COMMAND_CASES } from '../../worktree-cases-commands.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const WORKTREE = COMMAND_CASES['inside-the-project.mjs'];
if (!WORKTREE) throw new Error('inside-the-project has no worktree case');

holdsTheContract({
  hook: 'inside-the-project.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { ...write(join(`${project}-beside`, 'src/n.ts'), 'x'), cwd: project }, status: 0 }),
  worktree: WORKTREE,
});
