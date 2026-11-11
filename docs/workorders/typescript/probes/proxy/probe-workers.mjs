// Worker-thread cost: start time and memory, bare and with every installed hook imported.
import { Worker } from 'node:worker_threads';
import { readdirSync } from 'node:fs';
// the measured project's installed hooks, named by the run: PROBE_HOOKS_DIR=<project>/.claude/hooks/ (W1.5 measured a synth project's)
const DIR = process.env.PROBE_HOOKS_DIR ?? '';
if (!DIR.endsWith('/')) throw new Error('set PROBE_HOOKS_DIR to a project\'s .claude/hooks/ folder, with its trailing slash');
const skip = new Set(['idle-wake.mjs', 'build-sweep.mjs']);
const files = readdirSync(DIR).filter((f) => f.endsWith('.mjs') && !skip.has(f)).map((f) => DIR + f);
const mb = () => Math.round(process.memoryUsage().rss / 1048576);
const body = new URL('./probe-worker-body.mjs', import.meta.url);
const start = (load) => new Promise((res) => { const t = performance.now(); const w = new Worker(body, { workerData: { files, load }, stdin: false }); w.once('message', (m) => res({ w, ms: performance.now() - t, m })); });
process.env.PROBE_X = 'before';
console.log('main rss MB', mb(), 'hooks', files.length);
const bare = await start(false); console.log('bare worker: ms', bare.ms.toFixed(1), 'rss MB', mb(), 'chdir in worker:', bare.m.chdir);
for (let i = 0; i < 4; i += 1) { const r = await start(true); console.log(`loaded worker ${i + 1}: ms`, r.ms.toFixed(1), 'imports ms', r.m.ms.toFixed(1), 'rss MB', mb(), 'failed', r.m.failed.join('; ') || 'none'); }
const t = performance.now(); await Promise.all([...Array(4)].map(() => start(true))); console.log('4 more at once: ms', (performance.now() - t).toFixed(1), 'rss MB', mb());
process.exit(0);
