// db-wipe-guard: a wipe of a database is judged by the checkout's own .env. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { bash } from '../../fixtures/installs.mts';
import { extraFixture, holdsTheContract } from '../hook-rig.mts';

/** A copy of the install with the postgres pack (no fixture names one). */
const postgresInstall = (): string => extraFixture('postgres', ['postgres']);

holdsTheContract({
  hook: 'db-wipe-guard.mjs',
  dir: postgresInstall,
  same: (project) => {
    put(join(project, '.env'), 'DATABASE_URL=postgres://app@db.prod.example.com:5432/app\n');
    return { payload: { ...bash('npx prisma migrate reset'), cwd: project }, status: 2 };
  },
});
