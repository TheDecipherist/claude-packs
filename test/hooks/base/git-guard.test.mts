// git-guard: the house laws of git (no force push, no token in a URL, the trunk and pushes the owner's where the layout says so).
// The hook's contract (its selftest, its worktree case, the emitted verdict equal to the source's), then the refusals that sat in
// the old root test files.
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'git-guard.mjs',
  dir: () => fixture('audio-core'),
  same: () => ({ payload: bash('git push --force origin work/x'), status: 2 }),
});
