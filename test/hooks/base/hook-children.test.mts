// KWB-205: a hook past its deadline takes its children with it. A planted hook starts a spinning child (`sh -c 'while :; do :; done'`)
// through child-group's startGroup; the pool abandons the job (the deadline), drops the worker, or closes, and none of the child's
// processes is left. The teardown kills the spinner whatever happens.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { runHook } from '../../../packs/base/hooks/lib/selftest.mts';
import { startPool, type Pool } from '../../../packs/base/hooks/resident/pool.mts';
import { assert, test } from '../../kit-cli.mts';

const WORKER = new URL('../../../packs/base/hooks/resident/worker.mjs', import.meta.url);
const GROUP = new URL('../../../packs/base/hooks/lib/child-group.mjs', import.meta.url).href;
const nap = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));
const ctx = { projectDir: '/p', cwd: '/p', env: {}, sessionPid: 1, now: 0, layout: { folders: {}, concepts: {} } };

/** The pids of the processes whose command line holds `tag`. */
function alive(tag: string): number[] {
  try { return execFileSync('pgrep', ['-f', tag], { encoding: 'utf8' }).split('\n').filter(Boolean).map(Number).filter((p) => p !== process.pid); } catch { return []; }
}
const kill = (tag: string): void => { try { execFileSync('pkill', ['-9', '-f', tag]); } catch { /* none left */ } };

async function until(ok: () => boolean, ms = 5000): Promise<void> {
  for (let t = 0; t < ms && !ok(); t += 25) await nap(25);
}

/** A pool whose one hook, `spins`, starts a spinner tagged `tag` and waits for it; `run` is given the pool and the job. */
async function withSpinner(run: (pool: Pool, job: ReturnType<typeof jobOf>, tag: string) => Promise<void>): Promise<void> {
  const tag = `kwb205-spin-${process.pid}-${Date.now()}`;
  const dir = scratchDir('hook-children-');
  put(join(dir, 'spins.mjs'), `import { startGroup } from '${GROUP}';\nexport async function hook(event, ctx) {\n  const c = startGroup('sh', ['-c', ': ${tag}; while :; do :; done'], { stdio: 'ignore' });\n  await new Promise((d) => c.on('exit', d));\n  return { code: 0, stdout: '', stderr: 'spun;' };\n}\n`);
  const pool = startPool({ workerUrl: WORKER, data: { dir, hooks: ['spins'], ext: '.mjs' }, warm: 1, preload: 1, max: 1, idleMs: 60_000, recycleAfter: 500, growAfterMs: 10, candidates: () => [], log: () => undefined });
  try {
    await pool.ready();
    await run(pool, jobOf('spins'), tag);
  } finally { await pool.close(); kill(tag); }
  assert.deepEqual(alive(tag), [], 'the teardown leaves no spinner');
}
const jobOf = (hook: string) => ({ hook, event: { hook_event_name: 'PreToolUse' }, ctx });

test('a job past its deadline: the pool abandons it and its spinning child is gone (KWB-205)', async () => {
  await withSpinner(async (pool, job, tag) => {
    const done = pool.run(job);
    await until(() => alive(tag).length > 0);
    assert.ok(alive(tag).length > 0, 'the planted hook started its spinner');
    await nap(100);   // the worker's word about the group reaches the main thread
    pool.abandon([job]);
    await until(() => alive(tag).length === 0);
    assert.deepEqual(alive(tag), [], 'no process of the spinner is alive after the deadline');
    assert.equal((await done).stderr, 'spun;', 'the hook ends by itself once its child is gone');
  });
});

test('a worker that is replaced or closed takes its children with it (KWB-205)', async () => {
  await withSpinner(async (pool, job, tag) => {
    void pool.run(job);
    await until(() => alive(tag).length > 0);
    assert.ok(alive(tag).length > 0);
    await nap(100);
    await pool.close();
    await until(() => alive(tag).length === 0);
    assert.deepEqual(alive(tag), [], 'closing the pool leaves no spinner');
  });
});

test('the selftest rig ends what a hook left running when it exits (KWB-205)', () => {
  const tag = `kwb205-rig-${process.pid}-${Date.now()}`;
  const dir = scratchDir('hook-children-rig-');
  const file = join(dir, 'leaves.mjs');
  put(file, `import { spawn } from 'node:child_process';\nspawn('sh', ['-c', ': ${tag}; while :; do :; done'], { stdio: 'ignore' }).unref();\nawait new Promise((d) => setTimeout(d, 200));\n`);
  try {
    runHook(file, dir, null, ['by-hand']);
    assert.deepEqual(alive(tag), [], 'no spinner left after the hook run');
  } finally { kill(tag); }
});
