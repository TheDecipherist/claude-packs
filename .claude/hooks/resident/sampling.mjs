// resident/sampling: the daemon's side of `hook-proxy sample` (typescript order W8.7, d-30). The daemon starts the sampler behind itself
// with its own pid (`--exit-with`: the sampler ends when the daemon does, as KWB-195's selftest daemons do), reads one JSON line a
// second or two from its stdout, keeps the latest in `usage` and gives it to the watchdog. A sampler that dies is started again up to
// MAX_RESTARTS times; one that cannot start leaves usage empty (usageOf is null) and says so in the daemon's log.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { coreBudget, projectLayout } from '../lib/core-budget.mjs';
import { readLayout } from '../lib/layout.mjs';
import { asRecord } from '../lib/merge-out.mjs';
import { parseSnapshot, usage } from './usage.mjs';
import { Watchdog } from './watchdog.mjs';
export const SAMPLE_MS = 2000;
const MAX_RESTARTS = 3;
const RESTART_DELAY_MS = 5000;
/** Whether the project's layout.json sets `guards.watchdog.stop` to true, read now. */
export function stopGuard(project) {
    const guards = asRecord(readLayout(project).guards);
    return asRecord(guards?.watchdog)?.stop === true;
}
export function startSampling(o) {
    const store = o.store ?? usage;
    const watchdog = new Watchdog({
        orphanMs: o.orphanMs, testMs: o.testMs, project: o.project, log: o.log,
        cap: o.capOf ?? (() => coreBudget({}, projectLayout(o.project))),
        stop: () => stopGuard(o.project),
        kill: (pid, signal) => { try {
            process.kill(pid, signal);
        }
        catch { /* gone already */ } },
    });
    const onSnapshot = (snap) => { store.record(snap, o.project); watchdog.observe(snap); };
    let child = null;
    let ending = false;
    let restarts = 0;
    const launch = () => {
        const env = Object.fromEntries(['HOME', 'PATH'].flatMap((k) => (o.env[k] === undefined ? [] : [[k, o.env[k]]])));
        const c = spawn(o.proxy, ['sample', '--project', o.project, '--interval', `${o.intervalMs}ms`, '--exit-with', String(process.pid)], { stdio: ['ignore', 'pipe', 'pipe'], env });
        child = c;
        createInterface({ input: c.stdout }).on('line', (line) => { const snap = parseSnapshot(line); if (snap !== null)
            onSnapshot(snap); });
        c.stderr.on('data', (d) => o.log(`sampler: ${d.toString('utf8').trim().slice(0, 300)}`));
        c.on('error', (e) => { o.log(`sampler could not start: ${e.message}`); child = null; });
        c.on('exit', (code, signal) => {
            store.clear();
            if (ending || child !== c)
                return;
            child = null;
            o.log(`sampler exited (${code ?? signal ?? '?'})${restarts < MAX_RESTARTS ? ', starting it again' : ', not started again'}`);
            if (restarts >= MAX_RESTARTS)
                return;
            restarts += 1;
            setTimeout(() => { if (!ending)
                launch(); }, RESTART_DELAY_MS).unref();
        });
    };
    launch();
    return {
        flags: () => watchdog.flags(),
        pid: () => child?.pid ?? null,
        stop: () => { ending = true; store.clear(); child?.kill('SIGTERM'); },
    };
}
