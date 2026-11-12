// resident/governor-pause: the load ceiling's guarantee (typescript order W8.8 item 5, with 0b's order), run by the daemon's watchdog
// on each sampler snapshot. When the 1-minute load stays above the governor's ceiling for HOLD_MS (30 s), one governed job's process
// group is paused (SIGSTOP): the lowest priority first, the newest first among equals (pauseOrder), and another HOLD_MS later the next;
// the oldest job is never paused, so the machine always moves on. When the load falls under the ceiling less 10 %, the paused jobs are
// resumed (SIGCONT) one at a time, RESUME_GAP_MS apart, the highest priority first (resumeOrder). A job paused over 10 minutes is named
// in the log once (the status line names it from the governor's own state). Pausing, never killing.
// The governor is the machine's, and every project's daemon runs a watchdog: one of them acts, the holder of a lease in the governor's
// folder (`pauser.json`: its pid and when it last acted), taken over when its holder is gone or has not renewed it for LEASE_MS.
import { join } from 'node:path';
import { budgetOf, inFlight, pauseOrder, resumeOrder, setPaused } from '../lib/governor.mjs';
import { governorDir } from '../lib/governor-store.mjs';
import { isRecord, readJson, writeJson } from '../lib/json.mjs';
/** How long the load stays over the ceiling before a job is paused, and between two pauses. */
export const HOLD_MS = 30_000;
/** The load a paused job waits for: the ceiling less 10 %. */
export const RESUME_SHARE = 0.9;
/** Between two resumes, so the 1-minute load can show what the last one added. */
export const RESUME_GAP_MS = 10_000;
/** A job paused this long is named. */
export const LONG_PAUSE_MS = 10 * 60_000;
/** A lease not renewed for this long is taken over. */
export const LEASE_MS = 15_000;
const what = (job) => `${job.id} (${job.kind}, priority ${job.priority}, group ${job.pgid ?? '-'}: ${job.command.slice(0, 80)})`;
export class Pauser {
    over = null;
    lastPause = -Infinity;
    lastResume = -Infinity;
    named = new Set();
    o;
    hold;
    gap;
    constructor(o) {
        this.o = o;
        this.hold = o.holdMs ?? HOLD_MS;
        this.gap = o.resumeGapMs ?? RESUME_GAP_MS;
    }
    /** One look at the load and the jobs: pause one, resume one, or neither. */
    observe() {
        const { host } = this.o;
        const now = host.now();
        if (!this.lease(now))
            return;
        const load = host.load();
        const { ceiling } = budgetOf(host);
        const jobs = inFlight(host).jobs;
        this.nameLongPauses(jobs, now);
        if (load > ceiling) {
            this.over ??= now;
            if (now - this.over >= this.hold && now - this.lastPause >= this.hold)
                this.pauseOne(jobs, now, load, ceiling);
            return;
        }
        this.over = null;
        if (load < ceiling * RESUME_SHARE && now - this.lastResume >= this.gap)
            this.resumeOne(jobs, now, load);
    }
    /** Every job this machine's governor holds paused is resumed: the daemon is stopping and nothing else would wake them. */
    release() {
        if (this.holder().pid !== this.o.self)
            return;
        for (const job of resumeOrder(inFlight(this.o.host).jobs))
            this.resume(job, `the daemon stopped`);
    }
    pauseOne(jobs, now, load, ceiling) {
        const oldest = [...jobs].sort((a, b) => a.start - b.start)[0];
        const next = pauseOrder(jobs).find((j) => j.id !== oldest?.id && j.pgid !== null);
        if (next === undefined || next.pgid === null)
            return;
        this.o.signal(next.pgid, 'SIGSTOP');
        setPaused(this.o.host, next.id, now);
        this.lastPause = now;
        this.o.log(`governor: load ${load.toFixed(1)} over the ceiling ${ceiling} for ${Math.round((now - (this.over ?? now)) / 1000)} s: paused ${what(next)}`);
    }
    resumeOne(jobs, now, load) {
        const next = resumeOrder(jobs)[0];
        if (next === undefined)
            return;
        this.resume(next, `load ${load.toFixed(1)} under the ceiling less 10 %`);
        this.lastResume = now;
    }
    resume(job, why) {
        if (job.pgid !== null)
            this.o.signal(job.pgid, 'SIGCONT');
        setPaused(this.o.host, job.id, null);
        this.named.delete(job.id);
        this.o.log(`governor: ${why}: resumed ${what(job)}`);
    }
    nameLongPauses(jobs, now) {
        for (const job of jobs) {
            if (job.pausedAt === null || now - job.pausedAt < LONG_PAUSE_MS || this.named.has(job.id))
                continue;
            this.named.add(job.id);
            this.o.log(`governor: ${what(job)} has been paused ${Math.round((now - job.pausedAt) / 60_000)} minutes`);
        }
    }
    /** Whether this daemon is the one that acts: it holds the lease, or takes it from a holder that is gone or silent. */
    lease(now) {
        const { host, self } = this.o;
        const { pid, at, file } = this.holder();
        if (pid !== self && pid > 0 && host.alive(pid) && now - at < LEASE_MS)
            return false;
        writeJson(file, { pid: self, at: now });
        return true;
    }
    /** The lease as its file holds it: the holder's pid and when it last acted (0 for none). */
    holder() {
        const file = join(governorDir(this.o.host.env, this.o.host.home), 'pauser.json');
        const held = readJson(file);
        return { file, pid: isRecord(held) && typeof held['pid'] === 'number' ? held['pid'] : 0, at: isRecord(held) && typeof held['at'] === 'number' ? held['at'] : 0 };
    }
}
