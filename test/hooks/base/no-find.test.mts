// no-find: a search of the disk by find is refused unless the user asked for it. The hook's contract, then its refusals.
import { bash } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'no-find.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: bash('find . -name x', project), status: 2 }),
});
