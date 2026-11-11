// stack-guard: the full-stack choices (no express, no vite) are held. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { write } from '../../fixtures/installs.mts';
import { assert, hookStatus, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'stack-guard.mjs',
  dir: () => fixture('full-stack'),
  same: (project) => ({ payload: write(join(project, 'api/package.json'), '{"dependencies":{"express":"5.1.0"}}\n'), status: 2 }),
});

// the full-stack hooks together, in the installed project: stack-guard, schemas-only, placement-law and secrets-guard
test('the full-stack hooks refuse express, a schema in a route and a .env git does not ignore, in the installed project', () => {
  const dir = fixture('full-stack');
  const run = (name: string, rel: string, content: string): number | null => hookStatus(dir, name, write(join(dir, rel), content));
  assert.equal(run('stack-guard.mjs', 'packages/api/package.json', '{"dependencies":{"express":"5.1.0"}}\n'), 2);
  assert.equal(run('stack-guard.mjs', 'packages/api/package.json', '{"dependencies":{"fastify":"5.6.1"}}\n'), 0);
  assert.equal(run('schemas-only.mjs', 'packages/api/src/routes/user.ts', 'const B = z.object({});\n'), 2);
  assert.equal(run('schemas-only.mjs', 'packages/core/src/schemas/user.ts', 'export const B = z.object({});\n'), 0);
  assert.equal(run('placement-law.mjs', 'packages/api/src/handlers/user.ts', "import { MongoClient } from 'mongodb';\n"), 2, 'the driver only in the adapters');
  assert.equal(run('placement-law.mjs', 'packages/api/src/adapters/db.ts', "import { MongoClient } from 'mongodb';\n"), 0);
  assert.equal(run('secrets-guard.mjs', '.env', 'A=1\n'), 2, 'a .env git does not ignore');
  assert.equal(run('schemas-only.mjs', 'packages/api/src/routes/ok.ts', "import { User } from '../../../core/src/schemas/user';\n"), 0);
});
