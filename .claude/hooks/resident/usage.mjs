// resident/usage: what the Go sampler (`hook-proxy sample`, proxy/sample.go) reports, and who each process belongs to (typescript order
// W8.7, d-30). One snapshot arrives every two seconds as a JSON line; the latest is kept here and `usageOf(owner)` is what the status
// line reads. An owner is a string:
//   `session:<pid>`  a Claude Code session, by its `claude` process (a hook event's `ppid` is that pid) and the tree under it;
//   `agent:<name>`   an agent, by its worktree folder `.claude/worktrees/<name>` (an agent working in its lead's folder has no folder
//                    of its own, so its processes are the lead's session's).
// A process belongs to the first that fits: it is a `claude` process (its own session), its folder is inside a worktree (that agent),
// its parent chain reaches a `claude` process (that session); else to none (an orphan the watchdog watches).
import { sep } from 'node:path';
import { parseJson } from '../lib/json.mjs';
import { asRecord } from '../lib/merge-out.mjs';
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v) => (typeof v === 'string' ? v : '');
function procOf(v) {
    const r = asRecord(v);
    if (r === null || typeof r.pid !== 'number')
        return null;
    return { pid: r.pid, ppid: num(r.ppid), cpu: num(r.cpu), rss: num(r.rss), comm: str(r.comm), cwd: str(r.cwd), args: str(r.args), orphan: r.orphan === true, claude: r.claude === true };
}
/** One line of the sampler's output; null when it is not a snapshot. */
export function parseSnapshot(line) {
    const r = asRecord(parseJson(line));
    if (r === null || typeof r.at !== 'number' || !Array.isArray(r.procs))
        return null;
    const procs = r.procs.flatMap((p) => { const one = procOf(p); return one === null ? [] : [one]; });
    return { at: r.at, dt: num(r.dt), self: num(r.self), source: str(r.source), procs };
}
export const sessionOwner = (pid) => `session:${pid}`;
export const agentOwner = (name) => `agent:${name}`;
/** The agent whose worktree folder `cwd` is in, under `<project>/.claude/worktrees/`. */
export function worktreeOf(cwd, project) {
    const root = `${project}${sep}.claude${sep}worktrees${sep}`;
    if (!cwd.startsWith(root))
        return null;
    const name = cwd.slice(root.length).split(sep)[0];
    return name !== undefined && name !== '' ? name : null;
}
/** The owner of each process of a snapshot, by pid (null: none). */
export function ownersOf(snap, project) {
    const byPid = new Map(snap.procs.map((p) => [p.pid, p]));
    const out = new Map();
    const sessionOf = (p) => {
        for (let at = p, hops = 0; at !== undefined && hops < 64; at = byPid.get(at.ppid), hops += 1)
            if (at.claude)
                return sessionOwner(at.pid);
        return null;
    };
    for (const p of snap.procs) {
        const agent = p.claude ? null : worktreeOf(p.cwd, project);
        out.set(p.pid, p.claude ? sessionOwner(p.pid) : agent !== null ? agentOwner(agent) : sessionOf(p));
    }
    return out;
}
/** Totals by owner for the snapshot; the sampler itself is nobody's. */
export function usageByOwner(snap, project) {
    const owners = ownersOf(snap, project);
    const sums = new Map();
    for (const p of snap.procs) {
        const owner = owners.get(p.pid) ?? null;
        if (owner === null || p.pid === snap.self)
            continue;
        const sum = sums.get(owner) ?? { cpu: 0, rss: 0, procs: 0 };
        sums.set(owner, { cpu: sum.cpu + p.cpu, rss: sum.rss + p.rss, procs: sum.procs + 1 });
    }
    return Object.fromEntries([...sums].map(([owner, s]) => [owner, { cpu: Math.round(s.cpu * 1000) / 10, rssMb: Math.round(s.rss / 104857.6) / 10, procs: s.procs }]));
}
/** A snapshot older than this is not what the machine is doing now: the sampler is down or stuck. */
export const STALE_MS = 10_000;
/** The latest snapshot's totals. One per daemon; `usageOf` below reads the daemon's. */
export class UsageStore {
    by = {};
    at = 0;
    now;
    constructor(now = Date.now) { this.now = now; }
    record(snap, project) { this.by = usageByOwner(snap, project); this.at = this.now(); }
    clear() { this.by = {}; this.at = 0; }
    /** The owner's totals, or null when it has no process in the latest snapshot or there is no fresh one. */
    usageOf(owner) { return this.now() - this.at > STALE_MS ? null : (this.by[owner] ?? null); }
    /** Every owner's totals (what the pid file and the status reply carry); empty when the snapshot is stale. */
    all() { return this.now() - this.at > STALE_MS ? {} : this.by; }
}
/** The running daemon's store (resident.mts makes it; the status line builder in the daemon reads `usageOf`). */
export const usage = new UsageStore();
/** What the status line reads: the owner's CPU, memory and process count now, or null when it has none. */
export const usageOf = (owner) => usage.usageOf(owner);
