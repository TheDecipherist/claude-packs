// secrets-guard: a secret is never written into source, and a .env git does not ignore is never staged. The hook's contract, then its refusals.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'secrets-guard.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: write(join(project, 'src/app.ts'), `const t = '${'gh' + 'p'}_${'a1B2'.repeat(9)}';\n`), status: 2 }),
});
