// The load governor's state (typescript order W8.8 item 1): the jobs in flight and the jobs waiting for slots, one JSON file in the
// user's cache folder, shared by every session, agent and project on the machine. Every change is made under one lock (a folder made
// atomically, holding its owner's pid), read whole and written whole through a rename, so two takes never both see the same free
// slots. A job or a waiter whose pid is gone is dropped on every read: a killed job's slots come back by themselves.
//   governorDir(env, home) -> the folder           liveState(dir, alive) -> the live state (nothing written)
//   changeState(dir, alive, fn) -> fn's answer, with the state fn left written under the lock
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRecord, readJson, writeJson } from './json.mjs';
export const KINDS = ['test', 'build', 'fuzz', 'agent', 'install', 'other'];
export const isKind = (word) => KINDS.includes(word);
/** A job's priority when it names none (item 0b): 0 to 1, the most of the budget it may hold. */
export const DEFAULT_PRIORITY = 0.5;
/** How long a change waits for the lock before it breaks a lock whose holder never let go. */
const LOCK_WAIT_MS = 2000;
/** A lock this old is a holder that died between making the folder and writing its pid. */
const LOCK_STALE_MS = 5000;
const STATE = 'jobs.json';
const LOCK = 'jobs.lock';
/** The governor's folder: CLAUDE_PACKS_GOVERNOR_DIR (a test's own), else `<cache>/claude-packs/governor` in the user's cache folder
 *  (XDG_CACHE_HOME, else ~/.cache), the folder the status line's RUNS cache and kit-fresh use. */
export const governorDir = (env, home) => env['CLAUDE_PACKS_GOVERNOR_DIR'] || join(env['XDG_CACHE_HOME'] || join(home, '.cache'), 'claude-packs', 'governor');
/** Waits `ms` without a timer: for a synchronous caller that waits its turn (a take's lock, buildq's queue). */
export const napSync = (ms) => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v) => (typeof v === 'string' ? v : '');
/** One stored entry read back: the shared fields checked, then `numbers` (each must be a number), or null when any is wrong. */
function entryOf(v, numbers) {
    if (!isRecord(v))
        return null;
    const pid = num(v['pid']), kind = str(v['kind']), id = str(v['id']);
    if (pid === null || !isKind(kind) || id === '')
        return null;
    const values = {};
    for (const key of numbers) {
        const n = num(v[key]);
        if (n === null)
            return null;
        values[key] = n;
    }
    // every key of `numbers` was set by the loop above (it returns on the first one missing); the compiler cannot follow a loop
    return { id, pid, kind, priority: num(v['priority']) ?? DEFAULT_PRIORITY, project: str(v['project']), raw: v, ...values };
}
function jobOf(v) {
    const e = entryOf(v, ['slots', 'start']);
    return e && { id: e.id, pid: e.pid, kind: e.kind, priority: e.priority, project: e.project, slots: e.slots, start: e.start,
        pgid: num(e.raw['pgid']), pausedAt: num(e.raw['pausedAt']), command: str(e.raw['command']) };
}
function waiterOf(v) {
    const e = entryOf(v, ['want', 'since']);
    return e && { id: e.id, pid: e.pid, kind: e.kind, priority: e.priority, project: e.project, want: e.want, since: e.since };
}
/** The state as the file holds it, every entry checked; a missing or broken file is an empty state. */
function storedState(dir) {
    const raw = readJson(join(dir, STATE));
    if (!isRecord(raw))
        return { jobs: [], waiting: [] };
    const jobs = Array.isArray(raw['jobs']) ? raw['jobs'].map(jobOf).filter((j) => j !== null) : [];
    const waiting = Array.isArray(raw['waiting']) ? raw['waiting'].map(waiterOf).filter((w) => w !== null) : [];
    return { jobs, waiting };
}
/** Only the entries whose pid is alive (the stale rule). */
const onlyLive = (s, alive) => ({ jobs: s.jobs.filter((j) => alive(j.pid)), waiting: s.waiting.filter((w) => alive(w.pid)) });
/** The live state, read without the lock and without writing: what the status line and `ask` read. */
export const liveState = (dir, alive) => onlyLive(storedState(dir), alive);
function holderOf(lock) {
    try {
        return Number(readFileSync(join(lock, 'pid'), 'utf8')) || null;
    }
    catch {
        return null;
    }
}
/** A lock whose holder is gone, or that has no holder long after it was made. */
function staleLock(lock, alive, now) {
    const holder = holderOf(lock);
    if (holder !== null)
        return !alive(holder);
    try {
        return now - statSync(lock).mtimeMs > LOCK_STALE_MS;
    }
    catch {
        return false;
    }
}
function holdLock(dir, alive) {
    mkdirSync(dir, { recursive: true });
    const lock = join(dir, LOCK);
    const deadline = Date.now() + LOCK_WAIT_MS;
    for (;;) {
        try {
            mkdirSync(lock);
            writeFileSync(join(lock, 'pid'), `${process.pid}\n`);
            return lock;
        }
        catch (e) {
            if (!(e instanceof Error && 'code' in e && e.code === 'EEXIST'))
                throw e;
            // a dead holder's lock, or one held past the wait (a holder stuck mid-change): broken, and taken on the next pass
            if (staleLock(lock, alive, Date.now()) || Date.now() > deadline)
                rmSync(lock, { recursive: true, force: true });
            else
                napSync(2);
        }
    }
}
/** Runs `fn` on the live state under the lock and writes what it leaves; the stale entries are dropped by the same write. */
export function changeState(dir, alive, fn) {
    const lock = holdLock(dir, alive);
    try {
        const state = onlyLive(storedState(dir), alive);
        const answer = fn(state);
        writeJson(join(dir, STATE), { v: 1, jobs: state.jobs, waiting: state.waiting }, { pretty: true });
        return answer;
    }
    finally {
        rmSync(lock, { recursive: true, force: true });
    }
}
