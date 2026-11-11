// W1.5 probe of d-10's resident runner (not the product; W8.2 builds that in TypeScript). One daemon per project: the hooks of a
// table run as judges on a pool of worker threads, one hook per worker at a time, so a worker's own output capture never crosses
// two events; after the first exit 2 it waits up to 30 ms for the rest and returns every refusal in table order.
//   node resident-probe.mjs --sock <path> --hooks <dir> --table a,b,c --pool <n> [--index <repo-index.json>] [--pidfile <f>]
// Wire (shared with client-probe.go): a request is a 4-byte big-endian length and a JSON header {v, env, cwd, ppid, deadline},
// then a 4-byte length and stdin's bytes; the reply is a 4-byte length and JSON {code, stdout, stderr}.
import { createServer } from 'node:net';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { parseArgs } from 'node:util';
import { parseJson, toJson } from '../../../../../packs/base/hooks/lib/json.mjs';

const { values: opt } = parseArgs({ options: { sock: { type: 'string' }, hooks: { type: 'string' }, table: { type: 'string' },
  pool: { type: 'string' }, index: { type: 'string' }, pidfile: { type: 'string' } } });
const table = (opt.table ?? '').split(',').filter(Boolean);
const size = Number(opt.pool ?? Math.min(16, cpus().length));
const index = opt.index ? parseJson(readFileSync(opt.index, 'utf8'), {}) : {};
const BODY = new URL('./resident-probe-worker.mjs', import.meta.url);

const idle = [];
const queue = [];
for (let i = 0; i < size; i += 1) {
  const w = new Worker(BODY, { workerData: { dir: opt.hooks, table }, stdin: false });
  w.on('message', (m) => {
    if (m.type === 'index') return w.postMessage({ type: 'index', id: m.id, hits: indexHits(m.lines) });
    if (m.type !== 'ready') w.job?.done(m);
    w.job = null;
    idle.push(w);
    pump();
  });
}
// The repetition index stays on the main thread; a worker asks for the candidate lines of its text, never for the index.
// The index is repo-index.mjs's own file: { rel: { shapes, st, defs } }; every statement shape goes into one set, once.
const statements = new Set(Object.values(index).flatMap((f) => f?.st ?? []).map((s) => (typeof s === 'string' ? s : toJson(s))));
const indexHits = (lines) => lines.filter((l) => statements.has(l)).length;
function pump() {
  while (idle.length && queue.length) { const w = idle.shift(); w.job = queue.shift(); w.postMessage(w.job.msg); }
}
const onWorker = (hook, text, env) => new Promise((done) => { queue.push({ msg: { type: 'run', hook, text, env }, done }); pump(); });

// One event: every judge at once; after the first refusal, 30 ms more, then every refusal in table order.
async function judge(text, env) {
  const results = new Map();
  let refusedAt = null;
  const all = Promise.all(table.map(async (hook) => {
    const r = await onWorker(hook, text, env);
    results.set(hook, r);
    if (r.code === 2 && refusedAt === null) refusedAt = Date.now();
  }));
  const grace = new Promise((ok) => {
    const t = setInterval(() => { if (refusedAt !== null) { clearInterval(t); setTimeout(ok, 30); } }, 1);
    all.then(() => clearInterval(t));
  });
  await Promise.race([all, grace]);
  const done = table.filter((h) => results.has(h)).map((h) => results.get(h));
  const refused = done.filter((r) => r.code === 2);
  return { code: refused.length ? 2 : 0, stdout: done.map((r) => r.stdout).join(''), stderr: (refused.length ? refused : done).map((r) => r.stderr).join('') };
}

const frame = (buf) => { const n = Buffer.alloc(4); n.writeUInt32BE(buf.length); return Buffer.concat([n, buf]); };
const server = createServer((c) => {
  let buf = Buffer.alloc(0);
  c.on('data', async (d) => {
    buf = Buffer.concat([buf, d]);
    if (buf.length < 4) return;
    const h = buf.readUInt32BE(0);
    if (buf.length < 8 + h) return;
    const s = buf.readUInt32BE(4 + h);
    if (buf.length < 8 + h + s) return;
    const head = parseJson(buf.subarray(4, 4 + h).toString('utf8'), {});
    const text = buf.subarray(8 + h, 8 + h + s).toString('utf8');
    buf = Buffer.alloc(0);
    const reply = await judge(text, head.env ?? {});
    c.end(frame(Buffer.from(toJson(reply))));
  });
});
try { unlinkSync(opt.sock); } catch { /* none left */ }
server.listen(opt.sock, () => {
  if (opt.pidfile) writeFileSync(opt.pidfile, `${process.pid}\n`);
  process.stdout.write(`ready ${process.pid}\n`);
});
process.on('SIGTERM', () => { try { unlinkSync(opt.sock); } catch { /* gone */ } process.exit(0); });
