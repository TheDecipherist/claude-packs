// resident/worker: one worker thread of the pool. It imports every hook the table gives the daemon once, then runs one hook of one
// event at a time with the event and a context built from the client's request, and says `{hook, ms, code}` and the hook's words.
// A hook never writes to a stream here: it returns a Verdict (review-2-go 2.1). A hook that throws, or returns none, is a crash with
// the runner's own message. A promise a hook rejects after it returned is logged to the main thread, not left to end the worker.
import { parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { childError } from '../lib/files.mts';
import { watchGroups } from '../lib/child-group.mts';
import { isVerdict } from '../lib/verdict.mts';
import type { FileStatements } from '../lib/near-copies.mts';
import type { Hook, HookContext } from '../lib/types.d.mts';
import { KNOWN_EVENTS } from './messages.mts';
import type { FromWorker, Job, RunJob, ToWorker, WorkerData } from './messages.mts';

const port = parentPort;
const data = workerData as WorkerData;
const say = (m: FromWorker): void => port?.postMessage(m);
watchGroups((e) => say({ type: 'group', ...e }));   // the children a hook starts are the main thread's to end (KWB-205)
const loaded = new Map<string, Hook | string>();
const waiting = new Map<number, (files: FileStatements[]) => void>();
let asked = 0;

const hookOf = (mod: unknown): Hook | null => {
  const fn = typeof mod === 'object' && mod !== null ? (mod as { hook?: unknown }).hook : undefined;
  return typeof fn === 'function' && fn.length >= 2 ? (fn as Hook) : null;
};

/** Imports one hook the first time this worker is asked for it (W8.4: a worker holds only the hooks it has run, so 16 warm workers do not
 *  each carry all of them). The import's time is no part of the hook's `ms`. */
async function ensure(name: string): Promise<void> {
  if (loaded.has(name)) return;
  try {
    const fn = hookOf(await import(pathToFileURL(join(data.dir, `${name}${data.ext}`)).href));
    loaded.set(name, fn ?? `${name} exports no hook(event, ctx)`);
  } catch (e) { loaded.set(name, `${name} could not be loaded: ${e instanceof Error ? e.message : childError(e)}`); }
}

/** A preloaded worker (the first few of the pool) imports every hook at start, so the first events of a session find them loaded. */
async function load(): Promise<void> {
  if (data.preload === true) for (const name of data.hooks) await ensure(name);
  say({ type: 'ready', failed: [...loaded].filter(([, v]) => typeof v === 'string').map(([k]) => k), loaded: [...loaded.keys()] });
}

/** The index lives on the main thread: a hook asks it which files hold these statements and gets those files' statements back. */
const candidates = (hashes: readonly string[]): Promise<FileStatements[]> => new Promise((done) => {
  asked += 1;
  waiting.set(asked, done);
  say({ type: 'ask', id: asked, hashes });
});

async function run(id: number, { hook, event, ctx }: Job): Promise<void> {
  await ensure(hook);
  const t0 = performance.now();
  const lines: string[] = [];
  const full: HookContext & { candidates: typeof candidates } = { ...ctx, log: (line: string): void => { lines.push(`${line}\n`); }, candidates };
  const fn = loaded.get(hook);
  let done = { hook, ms: 0, code: 1, stdout: '', stderr: '' };
  try {
    if (typeof fn !== 'function') throw new Error(fn ?? `${hook} is not in the table`);
    const verdict: unknown = await fn(event, full);
    if (!isVerdict(verdict)) throw new Error(`${hook} returned no Verdict`);
    done = { ...done, code: verdict.code, stdout: verdict.stdout, stderr: lines.join('') + verdict.stderr };
  } catch (e) {
    done = { ...done, stderr: `run-hooks: ${hook} failed: ${e instanceof Error ? (e.stack ?? e.message) : childError(e)}\n` };
  }
  say({ type: 'done', id, done: { ...done, ms: performance.now() - t0 } });
}

// The events this worker was sent, by key: an event's later jobs here carry only the key (pool.mts `travelling`, KWB-next).
const events = new Map<number, { event: Job['event']; ctx: Job['ctx'] }>();
function jobOf(j: RunJob): Job | null {
  if (j.event !== undefined && j.ctx !== undefined) {
    events.set(j.key, { event: j.event, ctx: j.ctx });
    if (events.size > KNOWN_EVENTS) events.delete(events.keys().next().value as number);
  }
  const e = events.get(j.key);
  return e ? { hook: j.hook, event: e.event, ctx: e.ctx } : null;
}

port?.on('message', (m: ToWorker) => {
  if (m.type === 'run') {
    const job = jobOf(m.job);
    if (job) void run(m.id, job);
    else say({ type: 'done', id: m.id, done: { hook: m.job.hook, ms: 0, code: 1, stdout: '', stderr: `worker: no event for key ${m.job.key}\n` } });
  }
  else { waiting.get(m.id)?.(m.files); waiting.delete(m.id); }
});
process.on('unhandledRejection', (e) => say({ type: 'log', line: `worker: unhandled rejection: ${e instanceof Error ? (e.stack ?? e.message) : childError(e)}` }));
process.on('uncaughtException', (e) => say({ type: 'log', line: `worker: uncaught exception: ${e.stack ?? e.message}` }));
await load();
