// The load governor's plants for the tests of its callers (W8.8): a job in a governor folder, as the governor's own file records it.
// Its own module, so a test of buildq reaches it without every test that reaches kit-cli.mts.
import { join } from 'node:path';
import { put } from '../packs/base/hooks/lib/files.mts';
import { toJson } from '../packs/base/hooks/lib/json.mts';

/** A planted job in a governor folder: `pid` holds `slots`. */
export function plantGovernorJob(governor: string, pid: number, slots: number): void {
  const job = { id: `g-planted-${pid}`, pid, pgid: null, kind: 'build', slots, priority: 0.5, project: '', start: 0, pausedAt: null, command: 'planted' };
  put(join(governor, 'jobs.json'), `${toJson({ v: 1, jobs: [job], waiting: [] })}\n`);
}
