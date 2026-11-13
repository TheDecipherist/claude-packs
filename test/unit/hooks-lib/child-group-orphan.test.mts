// lib/child-group.mts startOrphan (typescript order W10b soak finding): a daemon worker starts a child and is then ended, as the pool does when
// it recycles a worker. A child started by startGroup is the daemon's own and, with its thread gone, nothing collects its exit: it stays a
// zombie of this process (the soak saw 54 in an hour). A child started by startOrphan has init for its parent, and its group can still be ended.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { killGroup } from '../../../packs/base/hooks/lib/child-group.mts';

const LIB = pathToFileURL(new URL('../../../packs/base/hooks/lib/child-group.mts', import.meta.url).pathname).href;
const CHILD_SECONDS = 1;
const SETTLE_MS = 2500;
const WORKER_LIVES_MS = 200;

/** A worker that starts `sleep` with `start`, reports the group's pid and is ended at once; the group's pid. */
async function startedByWorker(start: 'startGroup' | 'startOrphan', seconds: number): Promise<number> {
  const code = `import { ${start} } from ${JSON.stringify(LIB)}; import { parentPort } from 'node:worker_threads';
    const c = ${start}('sleep', ['${seconds}'], { stdio: 'ignore' }); parentPort.postMessage(c.pid);`;
  const worker = new Worker(code, { eval: true });
  const pid = await new Promise<number>((ok, fail) => { worker.once('message', (m: number) => ok(m)); worker.once('error', fail); });
  await sleep(WORKER_LIVES_MS);   // a real worker lives for jobs after the start; the shell of startOrphan exits in a few ms
  await worker.terminate();
  return pid;
}

/** The zombie children of this process, by ps. */
function zombies(): number {
  const rows = spawnSync('ps', ['-axo', 'pid=,ppid=,stat='], { encoding: 'utf8' }).stdout.split('\n');
  return rows.filter((r) => { const [, ppid, stat] = r.trim().split(/\s+/); return Number(ppid) === process.pid && (stat ?? '').startsWith('Z'); }).length;
}

test('a child started in a worker that is ended before the child exits stays a zombie of the process (the leak, planted)', async () => {
  const before = zombies();
  await startedByWorker('startGroup', CHILD_SECONDS);
  await sleep(SETTLE_MS);
  assert.ok(zombies() > before, 'startGroup leaves a zombie behind');
});

test('startOrphan leaves no zombie of the process, and its group can still be ended', async () => {
  const before = zombies();
  await startedByWorker('startOrphan', CHILD_SECONDS);
  await sleep(SETTLE_MS);
  assert.equal(zombies(), before, 'nothing of this process is left to collect');
  const long = await startedByWorker('startOrphan', 30);
  await sleep(300);
  assert.equal(killGroup(long), true, 'the group is still there to end');
  await sleep(300);
  assert.throws(() => process.kill(-long, 0), 'and it is gone after');
  assert.equal(zombies(), before);
});
