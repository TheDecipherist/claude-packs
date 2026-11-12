// resident/pool: the worker pool (review-2-go 2.2, 2.3, 2.4, 2.7, 3.12). `warm` workers start with the daemon, the pool grows on
// demand to `max`, the grown ones are retired after `idleMs` idle, a worker is recycled after `recycleAfter` events, and a worker
// that exits (a hook called process.exit, an uncaught error) is replaced and its hook counted as a crash. One hook runs on one
// worker at a time, so the main thread does only I/O and the table.
import { Worker } from 'node:worker_threads';
import { killGroup } from '../lib/child-group.mjs';
/** A worker's heap is kept small: its hooks make short-lived garbage, and a large young generation is memory the daemon holds for nothing. */
/** How long a job waits for a worker that already holds its hook before a worker that does not may import it. */
const SPREAD_WAIT_MS = 50;
/** The pool grows one worker at a time, at most this often: a flood of events is a queue to drain, not a reason for 32 workers at once. */
const GROW_EVERY_MS = 500;
const WORKER_HEAP = { maxYoungGenerationSizeMb: 1 };
const crash = (job, why) => ({ hook: job.hook, ms: 0, code: 1, stdout: '', stderr: `run-hooks: ${job.hook} failed: ${why}\n` });
export function startPool(o) {
    const slots = new Set();
    const queue = [];
    const failed = new Set();
    let nextId = 0;
    let closing = false;
    let warming = o.warm;
    let grownAt = 0;
    let onWarm = null;
    let recheck;
    const send = (s, m) => s.worker.postMessage(m);
    const killGroups = (s) => { for (const pid of s.groups)
        killGroup(pid); s.groups.clear(); };
    const drop = (s) => { s.gone = true; slots.delete(s); killGroups(s); void s.worker.terminate(); };
    function spawn(preload = false) {
        const worker = new Worker(o.workerUrl, { workerData: { ...o.data, preload }, stdin: false, resourceLimits: WORKER_HEAP });
        const s = { worker, ready: false, busy: null, events: 0, idleSince: Date.now(), gone: false, preload, has: new Set(), groups: new Set() };
        slots.add(s);
        worker.on('message', (m) => {
            if (m.type === 'ready') {
                for (const f of m.failed)
                    failed.add(f);
                for (const h of m.loaded)
                    s.has.add(h);
                s.ready = true;
                s.idleSince = Date.now();
                if (warming > 0 && (warming -= 1) === 0)
                    onWarm?.();
                pump();
            }
            else if (m.type === 'done') {
                const job = s.busy;
                s.busy = null;
                s.events += 1;
                s.has.add(m.done.hook);
                s.idleSince = Date.now();
                job?.take(m.done);
                if (s.events >= o.recycleAfter) {
                    drop(s);
                    if (!closing)
                        spawn(s.preload);
                }
                else
                    pump();
            }
            else if (m.type === 'group') {
                if (m.kind === 'started')
                    s.groups.add(m.pid);
                else
                    s.groups.delete(m.pid);
            }
            else if (m.type === 'ask')
                void Promise.resolve(o.warming?.()).then(() => { if (!s.gone)
                    send(s, { type: 'answer', id: m.id, files: o.candidates(m.hashes) }); });
            else
                o.log(m.line);
        });
        worker.on('error', (e) => o.log(`worker error: ${e.stack ?? e.message}`));
        worker.on('exit', (code) => {
            if (s.gone)
                return;
            slots.delete(s);
            s.gone = true;
            killGroups(s);
            const held = s.busy;
            if (held)
                held.take(crash(held.job, `its worker exited (${code}) while it ran`));
            if (!s.ready && warming > 0 && (warming -= 1) === 0)
                onWarm?.();
            if (!closing) {
                o.log(`worker exited (${code}); replaced`);
                spawn(s.preload);
            }
        });
    }
    /** The idle worker for a hook: one that has it. A hook is imported by a new worker only while fewer than `spread` hold it, or once its job
     *  has waited SPREAD_WAIT_MS (W8.4: every hook in every worker is memory the daemon holds for nothing); the new holder is the worker with
     *  the fewest hooks. */
    function idleFor(hook, waited) {
        const idle = [...slots].filter((s) => s.ready && s.busy === null);
        const holder = idle.find((s) => s.has.has(hook));
        if (holder !== undefined)
            return holder;
        if (waited < SPREAD_WAIT_MS && [...slots].filter((s) => s.has.has(hook)).length >= (o.spread ?? Infinity))
            return undefined;
        return idle.reduce((best, s) => (best === undefined || s.has.size < best.has.size ? s : best), undefined);
    }
    function pump() {
        for (let i = 0; i < queue.length;) {
            const next = queue[i];
            const s = next === undefined ? undefined : idleFor(next.job.hook, Date.now() - next.at);
            if (next === undefined || s === undefined) {
                i += 1;
                continue;
            }
            queue.splice(i, 1);
            s.busy = { id: next.id, job: next.job, take: next.take };
            send(s, { type: 'run', id: next.id, job: next.job });
        }
        const first = queue[0];
        if (first === undefined || closing)
            return;
        // look again when a waiting job becomes allowed to spread a hook to a new worker, or to grow the pool
        const now = Date.now();
        const soon = queue.flatMap((w) => [o.growAfterMs, SPREAD_WAIT_MS].map((t) => w.at + t - now)).filter((t) => t > 0);
        if (soon.length > 0 && recheck === undefined)
            recheck = setTimeout(() => { recheck = undefined; pump(); }, Math.min(...soon));
        // grow only for work that has waited, and only when no worker is idle (a job held back for its hook's holders is not a full pool): a burst of
        // quick hooks drains before a new worker (25 ms to load its hooks) could help
        if (now - first.at < o.growAfterMs)
            return;
        const starting = [...slots].filter((s) => !s.ready).length;
        const idle = [...slots].some((s) => s.ready && s.busy === null);
        if (!idle && queue.length > starting && slots.size < o.max && now - grownAt >= GROW_EVERY_MS) {
            grownAt = now;
            spawn();
        }
    }
    // the grown workers go after idleMs without work; the warm ones stay
    const reaper = setInterval(() => {
        for (const s of slots)
            if (slots.size > o.warm && s.ready && s.busy === null && Date.now() - s.idleSince > o.idleMs)
                drop(s);
    }, Math.max(10, Math.min(60_000, o.idleMs / 4)));
    reaper.unref();
    for (let i = 0; i < o.warm; i += 1)
        spawn(i < (o.preload ?? 0));
    return {
        run: (job) => new Promise((resolve) => {
            const at = Date.now();
            nextId += 1;
            queue.push({ id: nextId, job, at, take: (d) => resolve({ ...d, queue: Math.max(0, Date.now() - at - d.ms) }) });
            pump();
        }),
        abandon: (jobs) => { for (const s of slots)
            if (s.busy !== null && jobs.includes(s.busy.job))
                killGroups(s); },
        ready: () => new Promise((resolve) => {
            if (warming <= 0)
                resolve([...failed]);
            else
                onWarm = () => resolve([...failed]);
        }),
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
