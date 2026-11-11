// db-wipe-guard: a wipe of a database is judged by the checkout's own .env. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { bash } from '../../fixtures/installs.mts';
import { assert, hookRun, test } from '../../kit-cli.mts';
import { checkoutsOf, extraFixture, holdsTheContract } from '../hook-rig.mts';

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

test('a wipe is judged against the worktree it runs in, by that checkout\'s .env', () => {
  const { here, wt } = checkoutsOf(postgresInstall());
  put(join(here, '.env'), 'DATABASE_URL=postgres://u@db.prod.example.com/app\n');
  put(join(wt, '.env'), 'DATABASE_URL=postgres://u@localhost/app\n');
  const reset = (cwd: string) => hookRun(here, 'db-wipe-guard.mjs', { tool_name: 'Bash', cwd, tool_input: { command: 'npx prisma migrate reset' } });
  assert.equal(reset(wt).status, 0);
  const refused = reset(here);
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /its target is db\.prod\.example\.com/);
});
