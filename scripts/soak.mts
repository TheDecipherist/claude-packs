// The W10b soak (typescript order W10b item 1): a planted project (under build/, never another project) with the synth-creator pack set,
// 8 clients replaying test/fixtures/replay/bandwarp-hooks.jsonl through the picker, the Go client and the resident runner for 60 minutes,
// with a kit update at 1/3 of the run, `kill -9` of the daemon at 1/2, one worker ended at 2/3 and the sampler killed at 5/6, sampled
// every 30 s into the evidence folder; heap snapshots at 15, 35 and 55 minutes of 60.
//   node scripts/soak.mts [--minutes 60] [--clients 8] [--rate 56] [--sample-s 30] [--out build/evidence/W10b]
// --rate is events per second over all clients (200,000 events in 60 minutes is 56 a second). Never shipped.
import { fork, type ChildProcess } from 'node:child_process';
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { toJson } from '../packs/base/hooks/lib/json.mts';
import { KIT, makeScratch, settingsCommandOf, sh } from './replay-lib.mts';
import { envOf, goneAfter, killDaemon, kitUpdate, leftBehind, stopDaemons, type Rig } from './soak-actions.mts';
import type { Counters } from './soak-client.mts';
import { attach, constructorsOf, growth, killWorker, takeSnapshot, type Inspector } from './soak-inspect.mts';
import { hostOf, newestDaemon, sampleRow, type Row } from './soak-probe.mts';
import { asTable, verdicts, type Facts } from './soak-summary.mts';

const args = process.argv.slice(2);
const opt = (name: string, otherwise: string): string => { const i = args.indexOf(name); return i < 0 ? otherwise : String(args[i + 1]); };
const minutes = Number(opt('--minutes', '60'));
const clientCount = Number(opt('--clients', '8'));
const rate = Number(opt('--rate', '56'));
const sampleS = Number(opt('--sample-s', '30'));
const out = resolve(KIT, opt('--out', 'build/evidence/W10b'));
const STEP_LIMIT_MS = 180 * 1000;
const IDLE_WINDOW_S = 15 * 60;
const SECOND = 1000;
const CLIENT_STOP_MS = 90 * SECOND;
const plan = { update: 1 / 3, killDaemon: 1 / 2, killWorker: 2 / 3, killSampler: 5 / 6, snaps: [[15 / 60, '15'], [35 / 60, '35'], [55 / 60, '55']] as const };

mkdirSync(out, { recursive: true });
const root = join(KIT, 'build', 'w10b-scratch');
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });
const note = (text: string): void => { appendFileSync(join(out, 'events.log'), `${new Date().toISOString()} ${text}\n`); process.stdout.write(`${text}\n`); };

const rig: Rig = { root, dir: join(root, 'proj'), cache: join(root, 'cache') };
const h = hostOf(rig.cache);
const keys = new Set<string>();
makeScratch(root, 200, { ...process.env, CLAUDE_PACKS_CACHE: rig.cache });
note(`scratch ${rig.dir}; ${clientCount} clients, ${rate} events/s, ${minutes} min, a sample every ${sampleS} s`);

// the first event starts the daemon, as Claude Code's first event does
const first = settingsCommandOf(rig.dir)('UserPromptSubmit', '-');
for (let i = 0; i < 60 && (newestDaemon(h, rig.dir)?.found.state.sampler ?? null) === null; i += 1) {
  if (first !== null && i % 5 === 0) sh(first, rig.dir, envOf(rig));
  await sleep(SECOND);
}
if (newestDaemon(h, rig.dir) === null) throw new Error('no daemon came up');

const stats = new Map<number, Counters>();
const differences = join(out, 'differences.jsonl');
writeFileSync(differences, '');
const clients: ChildProcess[] = [];
for (let i = 0; i < clientCount; i += 1) {
  const c = fork(join(KIT, 'scripts/soak-client.mts'), [toJson({ dir: rig.dir, cache: rig.cache, index: i, clients: clientCount, ratePerSec: rate / clientCount, differences })], { stdio: 'inherit' });
  c.on('message', (m) => { const r = m as Counters & { index: number }; stats.set(r.index, r); });   // the client's own report
  clients.push(c);
}

let inspector: { pid: number; i: Inspector } | null = null;
const daemonPid = (): number | null => newestDaemon(h, rig.dir)?.found.state.pid ?? null;
async function inspectorFor(pid: number | null): Promise<Inspector | null> {
  if (pid === null) return null;
  if (inspector?.pid === pid) return inspector.i;
  inspector?.i.close();
  inspector = null;
  try { inspector = { pid, i: await attach(pid) }; return inspector.i; } catch (e) { note(`no inspector for ${pid}: ${e instanceof Error ? e.message : String(e)}`); return null; }
}
/** A step that does not end in STEP_LIMIT_MS is a fault of the soak, written down and thrown. */
async function within<T>(step: Promise<T>, what: string): Promise<T> {
  const limit = new Promise<never>((_, fail) => setTimeout(() => fail(new Error(`${what} did not end in ${STEP_LIMIT_MS / SECOND} s`)), STEP_LIMIT_MS).unref());
  try { return await Promise.race([step, limit]); } catch (e) { note(String(e)); throw e; }
}
const closeInspector = (): void => { inspector?.i.close(); };
const rows: Row[] = [];
const started = Date.now();
const done = new Set<string>();
const marks: Record<string, number> = {};
let oldGone: Promise<number | null> = Promise.resolve(null);
const total = minutes * 60;

async function due(t: number): Promise<void> {
  const at = (name: string, fraction: number): boolean => { if (done.has(name) || t < total * fraction) return false; done.add(name); marks[name] = t; return true; };
  if (at('update', plan.update)) {
    const old = daemonPid();
    const u = kitUpdate(rig);
    note(`t=${t}s kit update: lock ${u.before} -> ${u.after}${u.viaUpdate ? '' : ' (update left the lock; a field of it was changed)'}`);
    if (old !== null) oldGone = goneAfter(old, IDLE_WINDOW_S * SECOND);
  }
  if (at('killDaemon', plan.killDaemon)) { const k = killDaemon(rig); note(`t=${t}s kill -9 daemon ${k?.pid} (sampler ${k?.sampler}), gone after ${k === null ? '-' : await goneAfter(k.pid, 10 * SECOND)} s`); }
  if (at('killWorker', plan.killWorker)) {
    const i = await inspectorFor(daemonPid());
    note(`t=${t}s worker ended: ${i === null ? 'no inspector' : await killWorker(i)}`);
  }
  if (at('killSampler', plan.killSampler)) {
    const s = newestDaemon(h, rig.dir)?.found.state.sampler ?? null;
    if (s !== null) process.kill(s, 'SIGKILL');
    note(`t=${t}s kill -9 sampler ${s}`);
  }
  for (const [fraction, label] of plan.snaps) {
    if (!at(`snap${label}`, fraction)) continue;
    const i = await inspectorFor(daemonPid());
    if (i !== null) { await takeSnapshot(i, join(out, `heap-${label}.heapsnapshot`)); note(`t=${t}s heap snapshot ${label}`); }
  }
}

try {
  for (let n = 1; n * sampleS <= total; n += 1) {
    const wait = started + n * sampleS * SECOND - Date.now();
    if (wait > 0) await sleep(wait);
    const t = Math.round((Date.now() - started) / SECOND);
    await within(due(t), `t=${t}s actions`);
    // a sample whose forced heap fails (the daemon went between two steps) is taken again without the inspector, and says so
    const row = await within(sampleRow(t, rig.dir, h, await within(inspectorFor(daemonPid()), 'inspector'), keys), `t=${t}s sample`).catch(() => sampleRow(t, rig.dir, h, null, keys));
    rows.push(row);
    appendFileSync(join(out, 'samples.jsonl'), `${toJson(row)}\n`);
    if (n % 10 === 0) note(`t=${t}s rss ${row.rssMb} MB heap ${row.heapMb} MB fds ${row.fds} workers ${row.workers} events played ${[...stats.values()].reduce((a, c) => a + c.done, 0)}`);
  }
} finally {
  for (const c of clients) c.send('stop');
  await Promise.all(clients.map((c) => new Promise<void>((ok) => { c.on('exit', () => ok()); setTimeout(() => { c.kill('SIGKILL'); ok(); }, CLIENT_STOP_MS).unref(); })));
}

const endRow = [...rows].reverse().find((r) => r.rssMb !== null);
const sum = (pick: (c: Counters) => number): number => [...stats.values()].reduce((a, c) => a + pick(c), 0);
const totals = { done: sum((c) => c.done), compared: sum((c) => c.compared), planted: sum((c) => c.refusalsCompared), seen: sum((c) => c.refusalsSeen), diff: sum((c) => c.differences), failed: sum((c) => c.failed) };
const afterKill = rows.find((r) => r.t >= (marks['killDaemon'] ?? Infinity) + 20 && r.pid !== null);
const afterWorker = rows.find((r) => r.t >= (marks['killWorker'] ?? Infinity) + 30);
const startRow = rows.find((r) => r.fds !== null);
// fds follow the pool (a daemon with 8 workers holds more than one with 2): the new daemon is held to the first one's count at the same worker number
const sameWorkers = afterKill === undefined ? undefined : rows.find((r) => r.pid === startRow?.pid && r.workers === afterKill.workers && r.fds !== null);
const beforeWorker = [...rows].reverse().find((r) => r.t < (marks['killWorker'] ?? 0) && r.workers !== null);
// the probe lets go of the daemon first: an inspector session attached to it is not part of what the daemon does when it stops
closeInspector();
note(`stopping: ${stopDaemons(rig)}`);
const gone = await Promise.race([oldGone, sleep(5 * SECOND).then(() => null)]);
await sleep(5 * SECOND);
const left = leftBehind(rig, keys);

const facts: Facts = {
  expectedSamples: Math.floor(total / sampleS), rows, differences: totals.diff, compared: totals.compared, refusalsCompared: totals.planted, refusalsSeen: totals.seen,
  events: totals.done + totals.compared, startFds: sameWorkers?.fds ?? startRow?.fds ?? null, startChildren: startRow?.childrenNoSampler ?? null, startWorkers: beforeWorker?.workers ?? null,
  afterKill: afterKill === undefined ? null : { fds: afterKill.fds, children: afterKill.childrenNoSampler }, afterWorker: afterWorker === undefined ? null : { workers: afterWorker.workers },
  oldGoneS: gone, idleWindowS: IDLE_WINDOW_S, left, endRssMb: endRow?.rssMb ?? null,
};
const growing = (a: string, b: string): string => {
  try {
    const rowsOf = growth(constructorsOf(join(out, `heap-${a}.heapsnapshot`)), constructorsOf(join(out, `heap-${b}.heapsnapshot`)));
    return rowsOf.map((g) => `| ${g.name} | ${g.count} | ${g.dCount} | ${(g.dSize / 1024).toFixed(0)} |`).join('\n');
  } catch (e) { return `unread: ${String(e)}`; }
};
const head = '| constructor | count at the later snapshot | change in count | change in self size (KB) |\n|---|---|---|---|';
writeFileSync(join(out, 'summary.md'), `# W10b soak, ${minutes} min, ${clientCount} clients\n\n${asTable(verdicts(facts))}\n\nclient failures (exit code other than 0 or 2): ${totals.failed}\n\n`
  + `## Top 10 growing constructors, minute 15 to 55 (different daemons: the update and the kill -9 came between)\n\n${head}\n${growing('15', '55')}\n\n`
  + `## Top 10 growing constructors, minute 35 to 55 (the same daemon)\n\n${head}\n${growing('35', '55')}\n`);
writeFileSync(join(out, 'summary.json'), toJson({ facts: { ...facts, rows: rows.length }, totals, marks }));
note(`done: ${totals.done} events (${totals.compared} compared), ${totals.diff} differences, left behind: ${left.length === 0 ? 'nothing' : left.join('; ')}`);
for (const l of left) { const m = /^process (\d+)/.exec(l); if (m !== null) try { process.kill(Number(m[1]), 'SIGKILL'); } catch { /* gone */ } }
process.exit(0);
