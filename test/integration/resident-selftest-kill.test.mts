// KWB-195: a daemon a selftest started never outlives the selftest. doctor kills a selftest that passes its timeout, and a killed node
// runs no `finally`, while the daemons it started are detached (their own session). Each daemon a selftest starts is given the
// selftest's pid and ends when that process is gone, however it went.
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { RESIDENT } from '../../packs/base/hooks/resident/selftest-rig.mts';
import { assert, test } from '../kit-cli.mts';

/** The daemons whose project folder is under `tmp`: pids read off the process table. */
function daemonsUnder(tmp: string): number[] {
  const table = spawnSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }).stdout.split('\n');
  return table.filter((l) => l.includes('resident') && l.includes('--serve ' + tmp)).map((l) => Number(l.trim().split(/\s+/)[0]));
}
const nap = (ms: number): Promise<void> => new Promise((d) => setTimeout(d, ms));

for (const signal of ['SIGTERM', 'SIGKILL'] as const) {
  test(`a resident selftest cut by ${signal} leaves no daemon behind`, { timeout: 120_000 }, async () => {
    const tmp = scratchDir('selftest-kill-');
    const child = spawn(process.execPath, [RESIDENT, '--selftest'], { env: { ...process.env, TMPDIR: tmp }, stdio: 'ignore' });
    let found: number[] = [];
    try {
      for (let i = 0; i < 400 && found.length === 0; i += 1) { await nap(50); found = daemonsUnder(join(tmp)); }
      assert.ok(found.length > 0, 'the selftest started a daemon');
      child.kill(signal);
      for (let i = 0; i < 160 && daemonsUnder(tmp).length > 0; i += 1) await nap(50);
      assert.deepEqual(daemonsUnder(tmp), [], 'the selftest is gone, and so is every daemon it started');
    } finally {
      for (const pid of daemonsUnder(tmp)) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
      child.kill('SIGKILL');
    }
  });
}
