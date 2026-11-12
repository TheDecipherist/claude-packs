// run-held: a long run (the gate's test runner) started so that stopping its starter stops it too (KWB-212). A stopped
// test-changed left its `node --test` child running under launchd for 19 minutes. The run leads its own process group
// (lib/child-group.mts, KWB-205); a SIGTERM, SIGINT or SIGHUP to the starter is passed on to that whole group, and the
// starter ends with the run.
//   runHeld(command, args, options) -> the run's exit code
import type { SpawnOptions } from 'node:child_process';
import { killGroup, startGroup } from '../packs/base/hooks/lib/child-group.mts';

const STOPS = ['SIGTERM', 'SIGINT', 'SIGHUP'] as const;
const STOPPED_CODE = 143;

export function runHeld(command: string, args: readonly string[], options: SpawnOptions = {}): Promise<number> {
  const child = startGroup(command, args, { ...options, stdio: 'inherit' });
  const pid = child.pid;
  const stop = (): void => { if (pid !== undefined) killGroup(pid); process.exit(STOPPED_CODE); };
  for (const s of STOPS) process.on(s, stop);
  return new Promise((done) => {
    child.once('error', () => done(1));
    child.once('close', (code) => {
      for (const s of STOPS) process.off(s, stop);
      done(code ?? 1);
    });
  });
}
