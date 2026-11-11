// suite-once: the whole suite runs only when the user's prompt asks for a full run. The hook's contract, then its refusals.
import { bash } from '../../fixtures/installs.mts';
import { commandCase } from '../command-case.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'suite-once.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: bash('npm test', project), status: 2 }),
  worktree: commandCase('suite-once.mjs'),
});
