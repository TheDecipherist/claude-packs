// The load governor's state (typescript order W8.8 item 1): the jobs in flight and the jobs waiting for slots, one JSON file in the
// user's cache folder, shared by every session, agent and project on the machine. Every change is made under one lock (a folder made
// atomically, holding its owner's pid), read whole and written whole through a rename, so two takes never both see the same free
// slots. A job or a waiter whose pid is gone is dropped on every read: a killed job's slots come back by themselves.
//   governorDir(env, home) -> the folder           liveState(dir, alive) -> the live state (nothing written)
//   changeState(dir, alive, fn) -> fn's answer, with the state fn left written under the lock
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRecord, readJson, writeJson } from './json.mts';
import type { Env } from './types.d.mts';

/** What a job is for: it picks the settings it is started with and how much it asks for by default. */
export type JobKind = 'test' | 'build' | 'fuzz' | 'agent' | 'install' | 'other';
export const KINDS: readonly JobKind[] = ['test', 'build', 'fuzz', 'agent', 'install', 'other'];
export const isKind = (word: string): word is JobKind => (KINDS as readonly string[]).includes(word);

/** A job's priority when it names none (item 0b): 0 to 1, the most of the budget it may hold. */
export const DEFAULT_PRIORITY = 0.5;

/** What a job and a waiter share: an id, the holder's pid (the entry is dropped when it is gone), what it is, its priority (item 0b)
 *  and its project. */
interface Entry { id: string; pid: number; kind: JobKind; priority: number; project: string }

/** A job holding slots: its process group when it has one of its own (the watchdog pauses the group), how many slots it holds
 *  and when it started. */
export interface Job extends Entry {
  pgid: number | null;
  slots: number;
  start: number;
  /** Set while the watchdog holds the job's group stopped (item 5): when it was paused. */
  pausedAt: number | null;
  /** The command, when the job was started by one (for the status line and the log). */
  command: string;
}

/** A job waiting for slots: first in, first served. */
export interface Waiter extends Entry { want: number; since: number }

export interface GovernorState { jobs: Job[]; waiting: Waiter[] }

/** How long a change waits for the lock before it breaks a lock whose holder never let go. */
const LOCK_WAIT_MS = 2000;
/** A lock this old is a holder that died between making the folder and writing its pid. */
const LOCK_STALE_MS = 5000;
const STATE = 'jobs.json';
const LOCK = 'jobs.lock';

/** The governor's folder: CLAUDE_PACKS_GOVERNOR_DIR (a test's own), else `<cache>/claude-packs/governor` in the user's cache folder
 *  (XDG_CACHE_HOME, else ~/.cache), the folder the status line's RUNS cache and kit-fresh use. */
export const governorDir = (env: Env, home: string): string =>
  env['CLAUDE_PACKS_GOVERNOR_DIR'] || join(env['XDG_CACHE_HOME'] || join(home, '.cache'), 'claude-packs', 'governor');

/** Waits `ms` without a timer: for a synchronous caller that waits its turn (a take's lock, buildq's queue). */
export const napSync = (ms: number): void => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); };
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** One stored entry read back: the shared fields checked, then `numbers` (each must be a number), or null when any is wrong. */
function entryOf<K extends string>(v: unknown, numbers: readonly K[]): (Entry & Record<K, number> & { raw: Record<string, unknown> }) | null {
  if (!isRecord(v)) return null;
  const pid = num(v['pid']), kind = str(v['kind']), id = str(v['id']);
  if (pid === null || !isKind(kind) || id === '') return null;
  const values: Partial<Record<K, number>> = {};
  for (const key of numbers) {
    const n = num(v[key]);
    if (n === null) return null;
    values[key] = n;
  }
  // every key of `numbers` was set by the loop above (it returns on the first one missing); the compiler cannot follow a loop
  return { id, pid, kind, priority: num(v['priority']) ?? DEFAULT_PRIORITY, project: str(v['project']), raw: v, ...(values as Record<K, number>) };
}

function jobOf(v: unknown): Job | null {
  const e = entryOf(v, ['slots', 'start'] as const);
  return e && { id: e.id, pid: e.pid, kind: e.kind, priority: e.priority, project: e.project, slots: e.slots, start: e.start,
    pgid: num(e.raw['pgid']), pausedAt: num(e.raw['pausedAt']), command: str(e.raw['command']) };
}

function waiterOf(v: unknown): Waiter | null {
  const e = entryOf(v, ['want', 'since'] as const);
  return e && { id: e.id, pid: e.pid, kind: e.kind, priority: e.priority, project: e.project, want: e.want, since: e.since };
}

/** The state as the file holds it, every entry checked; a missing or broken file is an empty state. */
function storedState(dir: string): GovernorState {
  const raw = readJson<unknown>(join(dir, STATE));
  if (!isRecord(raw)) return { jobs: [], waiting: [] };
  const jobs = Array.isArray(raw['jobs']) ? raw['jobs'].map(jobOf).filter((j): j is Job => j !== null) : [];
  const waiting = Array.isArray(raw['waiting']) ? raw['waiting'].map(waiterOf).filter((w): w is Waiter => w !== null) : [];
  return { jobs, waiting };
}

/** Only the entries whose pid is alive (the stale rule). */
const onlyLive = (s: GovernorState, alive: (pid: number) => boolean): GovernorState =>
  ({ jobs: s.jobs.filter((j) => alive(j.pid)), waiting: s.waiting.filter((w) => alive(w.pid)) });

/** The live state, read without the lock and without writing: what the status line and `ask` read. */
export const liveState = (dir: string, alive: (pid: number) => boolean): GovernorState => onlyLive(storedState(dir), alive);

function holderOf(lock: string): number | null {
  try { return Number(readFileSync(join(lock, 'pid'), 'utf8')) || null; } catch { return null; }
}

/** A lock whose holder is gone, or that has no holder long after it was made. */
function staleLock(lock: string, alive: (pid: number) => boolean, now: number): boolean {
  const holder = holderOf(lock);
  if (holder !== null) return !alive(holder);
  try { return now - statSync(lock).mtimeMs > LOCK_STALE_MS; } catch { return false; }
}

function holdLock(dir: string, alive: (pid: number) => boolean): string {
  mkdirSync(dir, { recursive: true });
  const lock = join(dir, LOCK);
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      mkdirSync(lock);
      writeFileSync(join(lock, 'pid'), `${process.pid}\n`);
      return lock;
    } catch (e) {
      if (!(e instanceof Error && 'code' in e && e.code === 'EEXIST')) throw e;
      // a dead holder's lock, or one held past the wait (a holder stuck mid-change): broken, and taken on the next pass
      if (staleLock(lock, alive, Date.now()) || Date.now() > deadline) rmSync(lock, { recursive: true, force: true });
      else napSync(2);
    }
  }
}

/** Runs `fn` on the live state under the lock and writes what it leaves; the stale entries are dropped by the same write. */
export function changeState<T>(dir: string, alive: (pid: number) => boolean, fn: (state: GovernorState) => T): T {
  const lock = holdLock(dir, alive);
  try {
    const state = onlyLive(storedState(dir), alive);
    const answer = fn(state);
    writeJson(join(dir, STATE), { v: 1, jobs: state.jobs, waiting: state.waiting }, { pretty: true });
    return answer;
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}
