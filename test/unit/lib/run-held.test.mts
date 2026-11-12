// KWB-212: stopping the starter of a long run stops the run and everything it started.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { setTimeout as wait } from 'node:timers/promises';

const MODULE = fileURLToPath(new URL('../../../scripts/run-held.mts', import.meta.url));
const SETTLE_MS = 800;

/** The pids whose command line holds the marker. */
const holding = (marker: string): string[] =>
  (spawnSync('pgrep', ['-f', marker], { encoding: 'utf8' }).stdout ?? '').split('\n').filter(Boolean);

test('a run started by runHeld ends with its starter when the starter is stopped (KWB-212)', async (t) => {
  const marker = `run-held-probe-${process.pid}-${Date.now()}`;
  // the shell stays (a command follows the wait) and carries the marker as its $0; the starter's own command line has none
  const program = `import(process.argv[1]).then((m) => m.runHeld('sh', ['-c', 'sleep 300 & wait; :', process.argv[2].split('').reverse().join('')]))`;
  const starter = spawn(process.execPath, ['-e', program, MODULE, marker.split('').reverse().join('')], { stdio: 'ignore' });
  // teardown, whatever happened: the marked shell's children (its sleep), then the shell
  t.after(() => {
    for (const pid of holding(marker)) {
      spawnSync('pkill', ['-KILL', '-P', pid]);
      try { process.kill(Number(pid), 'SIGKILL'); } catch { /* already gone */ }
    }
  });
  await wait(SETTLE_MS);
  assert.equal(holding(marker).length > 0, true, 'the run started');
  starter.kill('SIGTERM');
  await wait(SETTLE_MS);
  assert.deepEqual(holding(marker), [], 'nothing the starter started is left running');
});
