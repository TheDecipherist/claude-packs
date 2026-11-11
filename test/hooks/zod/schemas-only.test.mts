// schemas-only: a zod schema lives in a schemas folder, never in a route. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'schemas-only.mjs',
  dir: () => fixture('full-stack'),
  same: (project) => ({ payload: write(join(project, 'api/src/routes/user.ts'), 'const B = z.object({ id: z.string() });\n'), status: 2 }),
});
