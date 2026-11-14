// rules-reach-the-shell: a path-scoped rule reaches a Bash call that touches its files. The hook's contract, then what it gives.
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'rules-reach-the-shell.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: bash('cat build.md', project), status: 0 }),
});
