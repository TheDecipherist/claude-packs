// The resident sampler and the watchdog against a real daemon and the real `hook-proxy sample` (typescript order W8.7, d-30): the totals of
// a planted session and a planted agent, a planted orphan spinner flagged (and left running) and then stopped once the guard is set, a
// planted test run over the cap flagged, and the control (a window nothing reaches) flagging nothing. Needs the built binary
// (`npm run build` with Go on PATH); without it the cases are skipped, as the proxy's own are.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as nap } from 'node:timers/promises';
import { join } from 'node:path';
import { put } from '../../packs/base/hooks/lib/files.mts';
import { parseJson, toJson } from '../../packs/base/hooks/lib/json.mts';
import { asRecord } from '../../packs/base/hooks/lib/merge-out.mts';
import { PLANTS } from '../../packs/base/hooks/resident/selftest-plants.mts';
import { EXT, alive, ask, client, eventText, makeRig, start, stopAll, type Rig } from '../../packs/base/hooks/resident/selftest-rig.mts';
import { hostTarget, shippedBinary } from '../../lib/proxy-binary.mts';
import { KIT, assert, test } from '../kit-cli.mts';

const target = hostTarget();
const BINARY = target === null ? '' : shippedBinary(KIT, target);
const HAVE = existsSync(BINARY);
const SPIN = 'for(;;);';
const SAMPLE_MS = 300;
const WAIT_MS = 15_000;
const sampleArgs = (extra: readonly string[]): string[] => ['--pool', '2', '--proxy', BINARY, '--sample-ms', String(SAMPLE_MS), ...extra];

interface Usage { cpu: number; rssMb: number; procs: number }
type Flag = Record<string, unknown>;
interface State { usage: Record<string, Usage>; flags: Flag[] }

/** The daemon's state as the status line asks for it: usage by owner and the watchdog's flags. */
async function status(rig: Rig): Promise<State> {
  const state = asRecord(parseJson<unknown>((await ask(rig, '', { status: true })).stdout)) ?? {};
  const usage: Record<string, Usage> = {};
  for (const [owner, u] of Object.entries(asRecord(state.usage) ?? {})) {
    const r = asRecord(u);
    if (r !== null) usage[owner] = { cpu: Number(r.cpu), rssMb: Number(r.rssMb), procs: Number(r.procs) };
  }
  const flags: Flag[] = [];
  for (const f of Array.isArray(state.flags) ? state.flags : []) { const r = asRecord(f); if (r !== null) flags.push(r); }
  return { usage, flags };
}

/** Asks for the state until `done` holds of it (or the wait is over); the last state either way. */
async function until(rig: Rig, done: (s: State) => boolean, ms = WAIT_MS): Promise<State> {
  let s = await status(rig);
  for (const t = Date.now(); !done(s) && Date.now() - t < ms; s = await status(rig)) await nap(SAMPLE_MS);
  return s;
}

/** A process that spins, whose parent has gone: reparented to init, the way an orphaned test run is. */
function orphanIn(cwd: string): number {
  const code = `const c=require('child_process').spawn(process.execPath,['-e',${JSON.stringify(SPIN)}],{cwd:${JSON.stringify(cwd)},detached:true,stdio:'ignore'});c.unref();process.stdout.write(String(c.pid));`;
  return Number(spawnSync(process.execPath, ['-e', code], { encoding: 'utf8' }).stdout);
}

/** Every process a test planted, ended with its group at the end of the test, whatever happened. */
const planted = new Set<number>();
const killGroup = (pid: number): void => { for (const p of [-pid, pid]) try { process.kill(p, 'SIGKILL'); } catch { /* gone */ } };
const worktreeOf = (rig: Rig, name: string): string => { const dir = join(rig.dir, '.claude', 'worktrees', name); put(join(dir, 'keep'), ''); return dir; };

async function inRig(layout: Record<string, unknown>, body: (rig: Rig) => Promise<void>): Promise<void> {
  const rig = makeRig(PLANTS, layout, 'sampler-');
  try { await body(rig); } finally {
    for (const pid of planted) killGroup(pid);
    planted.clear();
    await stopAll(rig);
  }
}

test('usage by owner: a session by its claude process and its tree, an agent by its worktree folder', { skip: !HAVE, timeout: 60_000 }, async () => {
  await inRig({}, async (rig) => {
    // a session: a process whose argv[0] is `claude`, in the project, with a spinning child that moved to another folder
    const child = `require('child_process').spawn(process.execPath,['-e',${JSON.stringify(SPIN)}],{cwd:'/tmp',stdio:'ignore'});setInterval(()=>{},1000)`;
    const session = spawn(process.execPath, ['-e', child], { argv0: 'claude', cwd: rig.dir, stdio: 'ignore', detached: true });
    const agent = spawn(process.execPath, ['-e', SPIN], { cwd: worktreeOf(rig, 'a1'), stdio: 'ignore', detached: true });
    planted.add(session.pid ?? 0).add(agent.pid ?? 0);
    assert.equal((await start(rig, sampleArgs([]))).kind, 'ready');
    const owner = `session:${session.pid}`;
    const { usage } = await until(rig, (s) => (s.usage[owner]?.procs ?? 0) >= 2 && (s.usage['agent:a1']?.cpu ?? 0) > 50);
    assert.ok((usage[owner]?.procs ?? 0) >= 2 && (usage[owner]?.cpu ?? 0) > 50 && (usage[owner]?.rssMb ?? 0) > 10, `session ${toJson(usage[owner])} in ${toJson(usage)}`);
    assert.ok(usage['agent:a1']?.procs === 1 && (usage['agent:a1']?.cpu ?? 0) > 50, `agent ${toJson(usage['agent:a1'])}`);
  });
});

test('an orphan spinner: nothing flags it in a window it has not filled (control), then it is flagged and left running, then stopped with the guard', { skip: !HAVE, timeout: 90_000 }, async () => {
  await inRig({}, async (rig) => {
    const pid = orphanIn(worktreeOf(rig, 'a1'));
    planted.add(pid);
    assert.ok(alive(pid), 'the planted orphan runs');
    // the control: a daemon whose window is longer than this test waits flags nothing, while the sampler sees the spinner
    assert.equal((await start(rig, sampleArgs(['--watchdog-ms', '600000']))).kind, 'ready');
    const seen = await until(rig, (s) => (s.usage['agent:a1']?.cpu ?? 0) > 50, 8000);
    assert.ok((seen.usage['agent:a1']?.cpu ?? 0) > 50, 'the spinner is sampled');
    await nap(3000);
    assert.deepEqual((await status(rig)).flags, [], 'a window not filled: no flag (the watchdog is the only thing that can flag)');
    await stopAll(rig);
    // the plant: a window of 2 s, no guard: flagged in the state, still running
    assert.equal((await start(rig, sampleArgs(['--watchdog-ms', '2000']))).kind, 'ready');
    const flagged = await until(rig, (s) => s.flags.length > 0);
    assert.deepEqual(flagged.flags.map((f) => [f.kind, f.pid, f.owner, f.stopped]), [['orphan-spinner', pid, 'agent:a1', false]], toJson(flagged));
    assert.ok(alive(pid), 'without guards.watchdog.stop it is left running');
    // the guard set between two snapshots: the daemon reads it again, and stops the orphan
    put(join(rig.dir, '.claude', 'layout.json'), toJson({ folders: {}, concepts: {}, guards: { watchdog: { stop: true } } }));
    for (const t = Date.now(); alive(pid) && Date.now() - t < WAIT_MS; await nap(100)) { /* waiting for it to end */ }
    assert.equal(alive(pid), false, 'stopped with the guard set');
    const after = await until(rig, (s) => s.flags.length === 0, 5000);
    assert.deepEqual(after.flags, [], 'and its flag is gone with it');
  });
});

test('a test run holding more cores than the kit\'s test cap is flagged', { skip: !HAVE, timeout: 90_000 }, async () => {
  await inRig({ guards: { buildq: { cores: 1 } } }, async (rig) => {
    const files = ['a', 'b', 'c', 'd'].map((n) => { const f = join(rig.dir, `${n}.test.mjs`); put(f, `import { test } from 'node:test';\ntest('spin', () => { for (const end = Date.now() + 40000; Date.now() < end;); });\n`); return f; });
    // NODE_TEST_CONTEXT is set when this runs under a test runner; passed on, the nested run reports to it and does not run its files
    const { NODE_TEST_CONTEXT: _context, ...env } = process.env;
    const run = spawn(process.execPath, ['--test', '--test-concurrency=4', ...files], { cwd: rig.dir, stdio: 'ignore', detached: true, env });
    planted.add(run.pid ?? 0);
    assert.equal((await start(rig, sampleArgs(['--test-ms', '2000']))).kind, 'ready');
    const s = await until(rig, (st) => st.flags.length > 0);
    const [flag] = s.flags;
    assert.deepEqual([flag?.kind, flag?.pid, flag?.cap, flag?.stopped], ['test-over-cap', run.pid, 1, false], toJson(s));
    assert.ok(Number(flag?.cores) > 2, `cores ${String(flag?.cores)}`);
  });
});

const EVENTS = 1000;
const POOL = 16;
const MB = 1048576;
const LIMIT_MB = 300;

const SAMPLER_COST_MB = 30;
/** The daemon's and the sampler's resident sets (bytes) after EVENTS events through POOL workers; `sampled` is 0 with no sampler. */
async function loaded(withSampler: boolean): Promise<{ daemon: number; sampled: number; workers: number }> {
  let out = { daemon: 0, sampled: 0, workers: 0 };
  await inRig({}, async (rig) => {
    assert.equal((await start(rig, ['--pool', String(POOL), '--state-ms', '1', ...(withSampler ? ['--proxy', BINARY, '--sample-ms', '2000'] : [])])).kind, 'ready');
    // sixteen at a time, so every worker serves: a burst the pool is as wide as keeps it from growing past 16
    for (let done = 0; done < EVENTS; done += POOL) {
      const batch = await Promise.all(Array.from({ length: Math.min(POOL, EVENTS - done) }, () => client(rig, eventText(rig, 'Fast'))));
      assert.deepEqual(batch.filter((j) => j.path !== 'daemon' || j.reply.code !== 0).length, 0, `after ${done} events`);
    }
    const state = asRecord(parseJson<unknown>((await ask(rig, '', { status: true })).stdout)) ?? {};
    const sampler = Number(state.sampler);
    assert.equal(withSampler, sampler > 0 && alive(sampler), `the sampler runs when asked for: ${toJson(state.sampler)}`);
    const sampled = withSampler ? Number(spawnSync('ps', ['-o', 'rss=', '-p', String(sampler)], { encoding: 'utf8' }).stdout.trim()) * 1024 : 0;
    out = { daemon: Number(state.rss), sampled, workers: Number(state.workers) };
  });
  return out;
}

// The rig runs the sources (.mts, type-stripped at run time, which costs a daemon about 250 MB more than the emitted .mjs an install
// runs), so the absolute line is held only where the daemon runs emitted code; the sampler's own cost is held everywhere.
const EMITTED = EXT === '.mjs';

test('the sampler adds under 30 MB to the daemon after 1,000 events with 16 workers, and the two together are under 300 MB on emitted code', { skip: !HAVE, timeout: 240_000 }, async (t) => {
  const alone = await loaded(false);
  const both = await loaded(true);
  t.diagnostic(`daemon alone ${Math.round(alone.daemon / MB)} MB; with the sampler ${Math.round(both.daemon / MB)} MB + sampler ${(both.sampled / MB).toFixed(1)} MB = ${Math.round((both.daemon + both.sampled) / MB)} MB (${both.workers} workers)`);
  assert.equal(both.workers, POOL);
  assert.ok(both.sampled > 0 && both.daemon - alone.daemon + both.sampled < SAMPLER_COST_MB * MB, 'the sampler and what it adds to the daemon are small');
  assert.ok(!EMITTED || (both.daemon + both.sampled) / MB < LIMIT_MB, `${Math.round((both.daemon + both.sampled) / MB)} MB`);
});
