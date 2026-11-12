// resident/watchdog: two faults the sampler's snapshots show (typescript order W8.7, d-30), flagged in the daemon's log and in the
// state the status line reads, and stopped only where `guards.watchdog.stop` is set in layout.json:
//   orphan-spinner  a process whose parent is gone (parent pid 1, or not running) that holds a core for `orphanMs` (60 s): the 49
//                   orphaned spinners of 2026-11-11. With the guard set it is sent SIGTERM, and SIGKILL if it is still there 5 s on.
//   test-over-cap   a test run (a node process started with `--test`, or a Go `<pkg>.test` binary, with every process under it) holding more cores than the kit's
//                   test cap (coreBudget) plus one core for the runner itself, for `testMs`. Flagged, never stopped.
// Time is the snapshot's own `at`, so a test drives it with planted snapshots.
import { ownersOf } from './usage.mjs';
export const HOT_CORES = 0.8;
export const ORPHAN_MS = 60_000;
export const TEST_MS = 15_000;
/** The runner and its reporter use a core of their own on top of the files it runs at once. */
export const TEST_RUNNER_CORES = 1;
export const KILL_AFTER_MS = 5000;
const TEST_ARG = /(^|\s)--test(\s|=|$)/;
// Go builds a package's tests as `<package>.test`; a fuzz run is that binary and one worker per core under it (KWB-211)
const GO_TEST_BINARY = /\.test$/;
const secs = (ms) => `${Math.round(ms / 1000)} s`;
export class Watchdog {
    hot = new Map();
    over = new Map();
    active = new Map();
    termAt = new Map();
    o;
    constructor(o) { this.o = o; }
    /** The flags standing now. */
    flags() { return [...this.active.values()]; }
    observe(snap) {
        const owners = ownersOf(snap, this.o.project);
        const live = new Set(snap.procs.map((p) => p.pid));
        this.orphans(snap, owners, live);
        this.tests(snap, owners);
        for (const [key, flag] of this.active) {
            if (live.has(flag.pid))
                continue;
            this.active.delete(key);
            this.termAt.delete(flag.pid);
            this.o.log(`watchdog: ${flag.kind} pid ${flag.pid} (${flag.comm}) is gone${flag.stopped ? ' (it was stopped)' : ''}`);
        }
        this.stopOrphans(snap.at, live);
    }
    orphans(snap, owners, live) {
        for (const p of snap.procs) {
            if (!p.orphan || p.claude || p.pid === snap.self || p.cpu < HOT_CORES) {
                this.hot.delete(p.pid);
                continue;
            }
            const since = this.hot.get(p.pid) ?? snap.at;
            this.hot.set(p.pid, since);
            const key = `orphan:${p.pid}`;
            if (snap.at - since < this.o.orphanMs)
                continue;
            const known = this.active.get(key);
            if (known !== undefined) {
                known.cores = p.cpu;
                continue;
            }
            const flag = { kind: 'orphan-spinner', pid: p.pid, comm: p.comm, cwd: p.cwd, owner: owners.get(p.pid) ?? null, cores: p.cpu, since, at: snap.at, stopped: false };
            this.active.set(key, flag);
            this.o.log(`watchdog: orphan spinner pid ${p.pid} (${p.comm}) has held ${p.cpu.toFixed(2)} cores for ${secs(snap.at - since)} with its parent gone, in ${p.cwd}${this.o.stop() ? '' : ' (guards.watchdog.stop is not set: left running)'}`);
        }
        for (const pid of this.hot.keys())
            if (!live.has(pid))
                this.hot.delete(pid);
    }
    tests(snap, owners) {
        const kids = new Map();
        for (const p of snap.procs)
            kids.set(p.ppid, [...(kids.get(p.ppid) ?? []), p]);
        const isRun = (p) => (p.comm === 'node' && TEST_ARG.test(p.args)) || GO_TEST_BINARY.test(p.comm);
        const byPid = new Map(snap.procs.map((p) => [p.pid, p]));
        const roots = snap.procs.filter((p) => isRun(p) && !(byPid.get(p.ppid) !== undefined && isRun(byPid.get(p.ppid) ?? p)));
        const seen = new Set();
        for (const root of roots) {
            seen.add(root.pid);
            let cores = 0;
            for (const queue = [root]; queue.length > 0;) {
                const p = queue.pop();
                if (p === undefined)
                    break;
                cores += p.cpu;
                queue.push(...(kids.get(p.pid) ?? []));
            }
            const cap = this.o.cap();
            if (cores <= cap + TEST_RUNNER_CORES) {
                this.over.delete(root.pid);
                continue;
            }
            const since = this.over.get(root.pid) ?? snap.at;
            this.over.set(root.pid, since);
            const key = `test:${root.pid}`;
            const known = this.active.get(key);
            if (known !== undefined) {
                known.cores = cores;
                continue;
            }
            if (snap.at - since < this.o.testMs)
                continue;
            this.active.set(key, { kind: 'test-over-cap', pid: root.pid, comm: root.comm, cwd: root.cwd, owner: owners.get(root.pid) ?? null, cores, since, at: snap.at, cap, stopped: false });
            this.o.log(`watchdog: test run pid ${root.pid} holds ${cores.toFixed(2)} cores, over the test cap of ${cap} (plus ${TEST_RUNNER_CORES} for the runner), for ${secs(snap.at - since)}, in ${root.cwd}`);
        }
        for (const pid of this.over.keys())
            if (!seen.has(pid))
                this.over.delete(pid);
    }
    /** With the guard set: SIGTERM to each orphan flagged, SIGKILL when it is still there KILL_AFTER_MS later. */
    stopOrphans(now, live) {
        if (!this.o.stop())
            return;
        for (const flag of this.active.values()) {
            if (flag.kind !== 'orphan-spinner' || !live.has(flag.pid))
                continue;
            const sent = this.termAt.get(flag.pid);
            if (sent === undefined) {
                this.termAt.set(flag.pid, now);
                flag.stopped = true;
                this.o.kill(flag.pid, 'SIGTERM');
                this.o.log(`watchdog: stopped orphan spinner pid ${flag.pid} (${flag.comm}) with SIGTERM`);
            }
            else if (now - sent >= KILL_AFTER_MS && sent >= 0) {
                this.termAt.set(flag.pid, -1);
                this.o.kill(flag.pid, 'SIGKILL');
                this.o.log(`watchdog: pid ${flag.pid} survived SIGTERM: sent SIGKILL`);
            }
        }
    }
}
