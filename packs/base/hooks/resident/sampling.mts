// resident/sampling: the daemon's side of `hook-proxy sample` (typescript order W8.7, d-30). The daemon starts the sampler behind itself
// with its own pid (`--exit-with`: the sampler ends when the daemon does, as KWB-195's selftest daemons do), reads one JSON line a
// second or two from its stdout, keeps the latest in `usage` and gives it to the watchdog. A sampler that dies is started again up to
// MAX_RESTARTS times; one that cannot start leaves usage empty (usageOf is null) and says so in the daemon's log.
import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { coreBudget, projectLayout } from '../lib/core-budget.mts';
import { readLayout } from '../lib/layout.mts';
import { asRecord } from '../lib/merge-out.mts';
import { keepEnv } from '../lib/proxy-wire.mts';
import { WIRE } from '../lib/proxy-wire-table.mts';
import { parseSnapshot, type Snapshot, type UsageStore } from './usage.mts';
import { Watchdog, type Flag } from './watchdog.mts';
import { Pauser } from './governor-pause.mts';
import { machineHost } from '../lib/governor.mts';

export const SAMPLE_MS = 2000;
const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 5000;   // the default of SamplingOptions.restartMs

export interface SamplingOptions {
  /** The `hook-proxy` binary (`--proxy`). */
  proxy: string;
  project: string;
  intervalMs: number;
  orphanMs: number;
  testMs: number;
  /** A test may set the cap (cores) the watchdog holds test runs to; otherwise it is coreBudget over the project's layout. */
  capOf?: () => number;
  log: (line: string) => void;
  env: Readonly<Record<string, string | undefined>>;
  /** The daemon's store of the totals this sampler reports. */
  store: UsageStore;
  /** How long before a sampler that ended is started again (a test shortens it). */
  restartMs?: number;
}

export interface Sampling { flags: () => Flag[]; stop: () => void; pid: () => number | null }

/** Whether the project's layout.json sets `guards.watchdog.stop` to true, read now. */
export function stopGuard(project: string): boolean {
  const guards = asRecord(readLayout(project).guards);
  return asRecord(guards?.watchdog)?.stop === true;
}

export function startSampling(o: SamplingOptions): Sampling {
  const store = o.store;
  const watchdog = new Watchdog({
    orphanMs: o.orphanMs, testMs: o.testMs, project: o.project, log: o.log,
    cap: o.capOf ?? ((): number => coreBudget({}, projectLayout(o.project))),
    stop: () => stopGuard(o.project),
    kill: (pid, signal) => { try { process.kill(pid, signal); } catch { /* gone already */ } },
  });
  // W8.8 item 5: the governor's ceiling held by pausing governed jobs, looked at on each snapshot
  const pauser = new Pauser({ host: machineHost(o.env), self: process.pid, log: o.log,
    signal: (pgid, signal) => { try { process.kill(-pgid, signal); } catch { /* the group is gone */ } } });
  const onSnapshot = (snap: Snapshot): void => { store.record(snap, o.project); watchdog.observe(snap); pauser.observe(); };
  let child: ChildProcess | null = null;
  let ending = false;
  let restarts = 0;
  const launch = (): void => {
    const env = keepEnv(o.env, WIRE.samplerKeeps);
    const c = spawn(o.proxy, ['sample', '--project', o.project, '--interval', `${o.intervalMs}ms`, '--exit-with', String(process.pid)], { stdio: ['ignore', 'pipe', 'pipe'], env });
    child = c;
    createInterface({ input: c.stdout }).on('line', (line) => { const snap = parseSnapshot(line); if (snap !== null) onSnapshot(snap); });
    c.stderr.on('data', (d: Buffer) => o.log(`sampler: ${d.toString('utf8').trim().slice(0, 300)}`));
    // a sampler that ended and one that could not start are the same to the daemon: its totals are gone, and it is tried again a few times
    const ended = (what: string): void => {
      store.clear();
      if (ending || child !== c) return;
      child = null;
      o.log(`${what}${restarts < MAX_RESTARTS ? ', starting it again' : ', not started again'}`);
      if (restarts >= MAX_RESTARTS) return;
      restarts += 1;
      setTimeout(() => { if (!ending) launch(); }, o.restartMs ?? RESTART_DELAY_MS).unref();
    };
    c.on('error', (e) => ended(`sampler could not start: ${e.message}`));
    c.on('exit', (code, signal) => ended(`sampler exited (${code ?? signal ?? '?'})`));
  };
  launch();
  return {
    flags: () => watchdog.flags(),
    pid: () => child?.pid ?? null,
    stop: () => { ending = true; store.clear(); pauser.release(); child?.kill('SIGTERM'); },
  };
}
