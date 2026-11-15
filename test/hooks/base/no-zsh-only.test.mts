// no-zsh-only: a zsh-only expansion is refused before Claude Code's own safety check stops for approval. The hook's contract.
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'no-zsh-only.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: bash('git add ${=FILES}', project), status: 2 }),
});
