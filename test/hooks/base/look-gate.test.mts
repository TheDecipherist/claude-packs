// look-gate: a look the branch changed must be proved before it lands. The hook's contract, then its refusals.
import { bash } from '../../fixtures/installs.mts';
import { commandCase } from '../command-case.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'look-gate.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { hook_event_name: 'PreToolUse', ...bash('git status', project) }, status: 0 }),
  worktree: commandCase('look-gate.mjs'),
});
