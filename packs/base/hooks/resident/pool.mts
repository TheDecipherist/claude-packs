// resident/pool: the worker pool (review-2-go 2.2, 2.3, 2.4, 2.7, 3.12). `warm` workers start with the daemon, the pool grows on
// demand to `max`, the grown ones are retired after `idleMs` idle, a worker is recycled after `recycleAfter` events, and a worker
// that exits (a hook called process.exit, an uncaught error) is replaced and its hook counted as a crash. One hook runs on one
// worker at a time, so the main thread does only I/O and the table.
import { Worker } from 'node:worker_threads';
import type { FileStatements } from '../lib/near-copies.mts';
import type { Done, FromWorker, Job, ToWorker, WorkerData } from './messages.mts';

export interface PoolOptions {
  workerUrl: URL;
  data: WorkerData;
  warm: number;
  max: number;
  idleMs: number;
  recycleAfter: number;
  /** How long a job waits for a free worker before the pool grows for it. */
  growAfterMs: number;
  /** The index on the main thread, asked by a worker. */
  candidates: (hashes: readonly string[]) => FileStatements[];
  log: (line: string) => void;
}

interface Slot { worker: Worker; ready: boolean; busy: { id: number; job: Job; take: (d: Done) => void } | null; events: number; idleSince: number; gone: boolean }
interface Waiting { id: number; job: Job; take: (d: Done) => void; at: number }

export interface Pool {
  run: (job: Job) => Promise<Done & { queue: number }>;
  /** Resolves when the warm workers have loaded their hooks. */
  ready: () => Promise<readonly string[]>;
  size: () => number;
  busy: () => number;
  close: () => Promise<void>;
}

/** A worker's heap is kept small: its hooks make short-lived garbage, and a large young generation is memory the daemon holds for nothing. */
const WORKER_HEAP = { maxYoungGenerationSizeMb: 1 };

const crash =(job: Job, why: string): Done => ({ hook: job.hook, ms: 0, code: 1, stdout: '', stderr: `run-hooks: ${job.hook} failed: ${why}\n` });

export function startPool(o: PoolOptions): Pool {
  const slots = new Set<Slot>();
  const queue: Waiting[] = [];
  const failed = new Set<string>();
  let nextId = 0;
  let closing = false;
  let warming = o.warm;
  let onWarm: (() => void) | null = null;
  let recheck: NodeJS.Timeout | undefined;

  const send = (s: Slot, m: ToWorker): void => s.worker.postMessage(m);
  const drop = (s: Slot): void => { s.gone = true; slots.delete(s); void s.worker.terminate(); };

  function spawn(): void {
    const worker = new Worker(o.workerUrl, { workerData: o.data, stdin: false, resourceLimits: WORKER_HEAP });
    const s: Slot = { worker, ready: false, busy: null, events: 0, idleSince: Date.now(), gone: false };
    slots.add(s);
    worker.on('message', (m: FromWorker) => {
      if (m.type === 'ready') {
        for (const f of m.failed) failed.add(f);
        s.ready = true;
        s.idleSince = Date.now();
        if (warming > 0 && (warming -= 1) === 0) onWarm?.();
        pump();
      } else if (m.type === 'done') {
        const job = s.busy;
        s.busy = null;
        s.events += 1;
        s.idleSince = Date.now();
        job?.take(m.done);
        if (s.events >= o.recycleAfter) { drop(s); if (!closing) spawn(); } else pump();
      } else if (m.type === 'ask') send(s, { type: 'answer', id: m.id, files: o.candidates(m.hashes) });
      else o.log(m.line);
    });
    worker.on('error', (e) => o.log(`worker error: ${e.stack ?? e.message}`));
    worker.on('exit', (code) => {
      if (s.gone) return;
      slots.delete(s);
      s.gone = true;
      const held = s.busy;
      if (held) held.take(crash(held.job, `its worker exited (${code}) while it ran`));
      if (!s.ready && warming > 0 && (warming -= 1) === 0) onWarm?.();
      if (!closing) { o.log(`worker exited (${code}); replaced`); spawn(); }
    });
  }

  function pump(): void {
    for (const s of slots) {
      const next = queue[0];
      if (next === undefined) break;
      if (!s.ready || s.busy !== null) continue;
      queue.shift();
      s.busy = { id: next.id, job: next.job, take: next.take };
      send(s, { type: 'run', id: next.id, job: next.job });
    }
    const first = queue[0];
    if (first === undefined || closing) return;
    // grow only for work that has waited: a burst of quick hooks drains before a new worker (25 ms to load its hooks) could help
    const waited = Date.now() - first.at;
    if (waited < o.growAfterMs) {
      if (recheck === undefined) recheck = setTimeout(() => { recheck = undefined; pump(); }, o.growAfterMs - waited);
      return;
    }
    const starting = [...slots].filter((s) => !s.ready).length;
    if (queue.length > starting && slots.size < o.max) spawn();
  }

  // the grown workers go after idleMs without work; the warm ones stay
  const reaper = setInterval(() => {
    for (const s of slots) if (slots.size > o.warm && s.ready && s.busy === null && Date.now() - s.idleSince > o.idleMs) drop(s);
  }, Math.max(10, Math.min(60_000, o.idleMs / 4)));
  reaper.unref();
  for (let i = 0; i < o.warm; i += 1) spawn();

  return {
    run: (job) => new Promise((resolve) => {
      const at = Date.now();
      nextId += 1;
      queue.push({ id: nextId, job, at, take: (d) => resolve({ ...d, queue: Math.max(0, Date.now() - at - d.ms) }) });
      pump();
    }),
    ready: () => new Promise((resolve) => {
      if (warming <= 0) resolve([...failed]);
      else onWarm = () => resolve([...failed]);
    }),
    size: () => slots.size,
    busy: () => [...slots].filter((s) => s.busy !== null).length,
    close: async () => {
      closing = true;
      clearInterval(reaper);
      clearTimeout(recheck);
      await Promise.all([...slots].map((s) => { s.gone = true; return s.worker.terminate(); }));
      slots.clear();
    },
  };
}
