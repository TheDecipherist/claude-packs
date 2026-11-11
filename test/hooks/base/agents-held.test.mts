// agents-held: a session with nobody there starts its agents in the foreground. The hook's contract (its selftest, its worktree
// case, the emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { COMMAND_CASES } from '../../worktree-cases-commands.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const WORKTREE = COMMAND_CASES['agents-held.mjs'];
if (!WORKTREE) throw new Error('agents-held has no worktree case');

holdsTheContract({
  hook: 'agents-held.mjs',
  dir: () => fixture('base'),
  same: () => ({
    payload: { tool_name: 'Agent', tool_input: { prompt: 'x', run_in_background: true } },
    env: { CLAUDE_PACKS_UNATTENDED: '1' },
    status: 2,
  }),
  worktree: WORKTREE,
});
