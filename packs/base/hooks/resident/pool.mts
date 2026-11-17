// resident/pool: the worker pool (review-2-go 2.2, 2.3, 2.4, 2.7, 3.12). `warm` workers start with the daemon, the pool grows on
// demand to `max`, the grown ones are retired after `idleMs` idle, a worker is recycled after `recycleAfter` events, and a worker
// that exits (a hook called process.exit, an uncaught error) is replaced and its hook counted as a crash. One hook runs on one
// worker at a time, so the main thread does only I/O and the table.
import { Worker } from 'node:worker_threads';
import { killGroup } from '../lib/child-group.mts';
import type { FileStatements } from '../lib/near-copies.mts';
import type { Done, FromWorker, Job, ToWorker, WorkerData } from './messages.mts';

export interface PoolOptions {
  workerUrl: URL;
  data: WorkerData;
  warm: number;
  /** How many of the warm workers import every hook at start; the rest import a hook when a job first brings it (W8.4: memory). */
  preload?: number;
  /** At most this many workers hold a hook, until a job for it has waited SPREAD_WAIT_MS (default: no limit). */
  spread?: number;
  max: number;
  idleMs: number;
  recycleAfter: number;
  /** How long a job waits for a free worker before the pool grows for it. */
  growAfterMs: number;
  /** The pool grows one worker at most this often (default GROW_EVERY_MS). */
  growEveryMs?: number;
  /** The clock the idle time is read by (default `Date.now`): a test plants one. */
  now?: () => number;
  /** The index on the main thread, asked by a worker. */
  candidates: (hashes: readonly string[]) => FileStatements[];
  /** A warm-up the main thread's index is still waiting on: an ask is answered after it (null: none). */
  warming?: () => Promise<void> | null;
  log: (line: string) => void;
}

/** `has`: the hooks this worker has imported; a job goes to an idle worker that has its hook, and a hook new to the pool to the one holding the fewest. */
interface Slot { worker: Worker; ready: boolean; busy: { id: number; job: Job; take: (d: Done) => void } | null; events: number; idleSince: number; gone: boolean; preload: boolean; has: Set<string>; groups: Set<number> }
interface Waiting { id: number; job: Job; take: (d: Done) => void; at: number }

export interface Pool {
  /** The deadline passed for these jobs: the process groups their hooks started are killed (KWB-205); a hook waiting on them ends by itself. */
  abandon: (jobs: readonly Job[]) => void;
  run: (job: Job) => Promise<Done & { queue: number }>;
  /** Resolves when the warm workers have loaded their hooks. */
  ready: () => Promise<readonly string[]>;
  /** Retires the grown workers that have been idle for `idleMs`, as the pool's own timer does every so often. */
  reap: () => void;
  size: () => number;
  busy: () => number;
  /** How many workers have imported a hook. */
  holders: (hook: string) => number;
  close: () => Promise<void>;
}

/** A worker's heap is kept small: its hooks make short-lived garbage, and a large young generation is memory the daemon holds for nothing. */
/** How long a job waits for a worker that already holds its hook before a worker that does not may import it. */
const SPREAD_WAIT_MS = 50;
/** The pool grows one worker at a time, at most this often: a flood of events is a queue to drain, not a reason for 32 workers at once. */
const GROW_EVERY_MS = 500;

const WORKER_HEAP = { maxYoungGenerationSizeMb: 1 };

const crash =(job: Job, why: string): Done => ({ hook: job.hook, ms: 0, code: 1, stdout: '', stderr: `run-hooks: ${job.hook} failed: ${why}\n` });

export function startPool(o: PoolOptions): Pool {
  const slots = new Set<Slot>();
  const queue: Waiting[] = [];
  const clock = o.now ?? Date.now;
  const failed = new Set<string>();
  let nextId = 0;
  let closing = false;
  let warming = o.warm;
  let grownAt = 0;
  let onWarm: (() => void) | null = null;
  let recheck: NodeJS.Timeout | undefined;

  const send = (s: Slot, m: ToWorker): void => s.worker.postMessage(m);
  const killGroups = (s: Slot): void => { for (const pid of s.groups) killGroup(pid); s.groups.clear(); };
  const drop = (s: Slot): void => { s.gone = true; slots.delete(s); killGroups(s); void s.worker.terminate(); };

  function spawn(preload = false): void {
    const worker = new Worker(o.workerUrl, { workerData: { ...o.data, preload }, stdin: false, resourceLimits: WORKER_HEAP });
    const s: Slot = { worker, ready: false, busy: null, events: 0, idleSince: clock(), gone: false, preload, has: new Set(), groups: new Set() };
    slots.add(s);
    worker.on('message', (m: FromWorker) => {
      if (m.type === 'ready') {
        for (const f of m.failed) failed.add(f);
        for (const h of m.loaded) s.has.add(h);
        s.ready = true;
        s.idleSince = clock();
        if (warming > 0 && (warming -= 1) === 0) onWarm?.();
        pump();
      } else if (m.type === 'done') {
        const job = s.busy;
        s.busy = null;
        s.events += 1;
        s.has.add(m.done.hook);
        s.idleSince = clock();
        job?.take(m.done);
        if (s.events >= o.recycleAfter) { drop(s); if (!closing) spawn(s.preload); } else pump();
      } else if (m.type === 'group') {
        if (m.kind === 'started') s.groups.add(m.pid); else s.groups.delete(m.pid);
      } else if (m.type === 'ask') void Promise.resolve(o.warming?.()).then(() => { if (!s.gone) send(s, { type: 'answer', id: m.id, files: o.candidates(m.hashes) }); });
      else o.log(m.line);
    });
    worker.on('error', (e) => o.log(`worker error: ${e.stack ?? e.message}`));
    worker.on('exit', (code) => {
      if (s.gone) return;
      slots.delete(s);
      s.gone = true;
      killGroups(s);
      const held = s.busy;
      if (held) held.take(crash(held.job, `its worker exited (${code}) while it ran`));
      if (!s.ready && warming > 0 && (warming -= 1) === 0) onWarm?.();
      if (!closing) { o.log(`worker exited (${code}); replaced`); spawn(s.preload); }
    });
  }

  /** The idle worker for a hook: one that has it. A hook is imported by a new worker only while fewer than `spread` hold it, or once its job
   *  has waited SPREAD_WAIT_MS (W8.4: every hook in every worker is memory the daemon holds for nothing); the new holder is the worker with
   *  the fewest hooks. */
  function idleFor(hook: string, waited: number): Slot | undefined {
    const idle = [...slots].filter((s) => s.ready && s.busy === null);
    const holder = idle.find((s) => s.has.has(hook));
    if (holder !== undefined) return holder;
    if (waited < SPREAD_WAIT_MS && [...slots].filter((s) => s.has.has(hook)).length >= (o.spread ?? Infinity)) return undefined;
    return idle.reduce<Slot | undefined>((best, s) => (best === undefined || s.has.size < best.has.size ? s : best), undefined);
  }

  function pump(): void {
    for (let i = 0; i < queue.length;) {
      const next = queue[i];
      const s = next === undefined ? undefined : idleFor(next.job.hook, Date.now() - next.at);
      if (next === undefined || s === undefined) { i += 1; continue; }
      queue.splice(i, 1);
      s.busy = { id: next.id, job: next.job, take: next.take };
      send(s, { type: 'run', id: next.id, job: next.job });
    }
    const first = queue[0];
    if (first === undefined || closing) return;
    // look again when a waiting job becomes allowed to spread a hook to a new worker, or to grow the pool
    const now = Date.now();
    const soon = queue.flatMap((w) => [o.growAfterMs, SPREAD_WAIT_MS].map((t) => w.at + t - now)).filter((t) => t > 0);
    if (soon.length > 0 && recheck === undefined) recheck = setTimeout(() => { recheck = undefined; pump(); }, Math.min(...soon));
    // grow only for work that has waited, and only when no worker is idle (a job held back for its hook's holders is not a full pool): a burst of
    // quick hooks drains before a new worker (25 ms to load its hooks) could help
    if (now - first.at < o.growAfterMs) return;
    const starting = [...slots].filter((s) => !s.ready).length;
    const idle = [...slots].some((s) => s.ready && s.busy === null);
    if (!idle && queue.length > starting && slots.size < o.max && now - grownAt >= (o.growEveryMs ?? GROW_EVERY_MS)) { grownAt = now; spawn(); }
  }

  // the grown workers go after idleMs without work; the warm ones stay
  const reap = (): void => {
    for (const s of [...slots]) if (slots.size > o.warm && s.ready && s.busy === null && clock() - s.idleSince > o.idleMs) drop(s);
  };
  const reaper = setInterval(reap, Math.max(10, Math.min(60_000, o.idleMs / 4)));
  reaper.unref();
  for (let i = 0; i < o.warm; i += 1) spawn(i < (o.preload ?? 0));

  return {
    run: (job) => new Promise((resolve) => {
      const at = Date.now();
      nextId += 1;
      queue.push({ id: nextId, job, at, take: (d) => resolve({ ...d, queue: Math.max(0, Date.now() - at - d.ms) }) });
      pump();
    }),
    abandon: (jobs) => { for (const s of slots) if (s.busy !== null && jobs.includes(s.busy.job)) killGroups(s); },
    ready: () => new Promise((resolve) => {
      if (warming <= 0) resolve([...failed]);
      else onWarm = () => resolve([...failed]);
    }),
    reap,
    size: () => slots.size,
    busy: () => [...slots].filter((s) => s.busy !== null).length,
    holders: (hook) => [...slots].filter((s) => s.has.has(hook)).length,
    close: async () => {
      closing = true;
      clearInterval(reaper);
      clearTimeout(recheck);
      await Promise.all([...slots].map((s) => { s.gone = true; killGroups(s); return s.worker.terminate(); }));
      slots.clear();
    },
  };
}
