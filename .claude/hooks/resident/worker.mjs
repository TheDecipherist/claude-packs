var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
// resident/worker: one worker thread of the pool. It imports every hook the table gives the daemon once, then runs one hook of one
// event at a time with the event and a context built from the client's request, and says `{hook, ms, code}` and the hook's words.
// A hook never writes to a stream here: it returns a Verdict (review-2-go 2.1). A hook that throws, or returns none, is a crash with
// the runner's own message. A promise a hook rejects after it returned is logged to the main thread, not left to end the worker.
import { parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { childError } from '../lib/files.mjs';
import { isVerdict } from '../lib/verdict.mjs';
const port = parentPort;
const data = workerData;
const say = (m) => port?.postMessage(m);
const loaded = new Map();
const waiting = new Map();
let asked = 0;
const hookOf = (mod) => {
    const fn = typeof mod === 'object' && mod !== null ? mod.hook : undefined;
    return typeof fn === 'function' && fn.length >= 2 ? fn : null;
};
async function load() {
    for (const name of data.hooks) {
        try {
            const fn = hookOf(await import(__rewriteRelativeImportExtension(pathToFileURL(join(data.dir, `${name}${data.ext}`)).href)));
            loaded.set(name, fn ?? `${name} exports no hook(event, ctx)`);
        }
        catch (e) {
            loaded.set(name, `${name} could not be loaded: ${e instanceof Error ? e.message : childError(e)}`);
        }
    }
    say({ type: 'ready', failed: [...loaded].filter(([, v]) => typeof v === 'string').map(([k]) => k) });
}
/** The index lives on the main thread: a hook asks it which files hold these statements and gets those files' statements back. */
const candidates = (hashes) => new Promise((done) => {
    asked += 1;
    waiting.set(asked, done);
    say({ type: 'ask', id: asked, hashes });
});
async function run(id, { hook, event, ctx }) {
    const t0 = performance.now();
    const lines = [];
    const full = { ...ctx, log: (line) => { lines.push(`${line}\n`); }, candidates };
    const fn = loaded.get(hook);
    let done = { hook, ms: 0, code: 1, stdout: '', stderr: '' };
    try {
        if (typeof fn !== 'function')
            throw new Error(fn ?? `${hook} is not in the table`);
        const verdict = await fn(event, full);
        if (!isVerdict(verdict))
            throw new Error(`${hook} returned no Verdict`);
        done = { ...done, code: verdict.code, stdout: verdict.stdout, stderr: lines.join('') + verdict.stderr };
    }
    catch (e) {
        done = { ...done, stderr: `run-hooks: ${hook} failed: ${e instanceof Error ? (e.stack ?? e.message) : childError(e)}\n` };
    }
    say({ type: 'done', id, done: { ...done, ms: performance.now() - t0 } });
}
port?.on('message', (m) => {
    if (m.type === 'run')
        void run(m.id, m.job);
    else {
        waiting.get(m.id)?.(m.files);
        waiting.delete(m.id);
    }
});
process.on('unhandledRejection', (e) => say({ type: 'log', line: `worker: unhandled rejection: ${e instanceof Error ? (e.stack ?? e.message) : childError(e)}` }));
process.on('uncaughtException', (e) => say({ type: 'log', line: `worker: uncaught exception: ${e.stack ?? e.message}` }));
await load();
