// resident/usage and resident/watchdog (W8.7): owners by session tree and worktree, usageOf's shape, and the two flags driven by planted
// snapshots (the snapshot's own clock), with the stop guard.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { UsageStore, ownersOf, parseSnapshot, usageByOwner, type Proc, type Snapshot } from '../../../packs/base/hooks/resident/usage.mts';
import { Watchdog, type WatchdogOptions } from '../../../packs/base/hooks/resident/watchdog.mts';

const P = '/work/p';
const proc = (pid: number, ppid: number, over: Partial<Proc> = {}): Proc => ({ pid, ppid, cpu: 0, rss: 0, comm: 'bash', cwd: P, args: '', orphan: false, claude: false, ...over });
const snap = (at: number, procs: Proc[]): Snapshot => ({ at, dt: 2000, self: 999, source: 'test', procs });

const TREE = [
  proc(100, 50, { claude: true, comm: '2.1.322', cpu: 0.1, rss: 800 * 1048576 }),
  proc(101, 100, { cwd: '/tmp', cpu: 0.5, rss: 10 * 1048576 }),                      // a shell that moved away: still the session's
  proc(102, 101, { comm: 'node', cpu: 1.25, rss: 90 * 1048576 }),
  proc(200, 100, { cwd: `${P}/.claude/worktrees/a1/pkg`, cpu: 2, rss: 50 * 1048576 }), // an agent's: by its worktree
  proc(201, 1, { cwd: `${P}/.claude/worktrees/a1`, cpu: 1, orphan: true }),             // an orphan in that worktree: still the agent's
  proc(300, 1, { cwd: P, cpu: 1, orphan: true }),                                       // an orphan in the main folder: nobody's
  proc(999, 1, { comm: 'hook-proxy', cpu: 0.2 }),                                       // the sampler
];

test('owners: a claude process is its own session, a worktree folder is an agent, the parent chain finds the session', () => {
  const owners = ownersOf(snap(1, TREE), P);
  assert.deepEqual([100, 101, 102, 200, 201, 300].map((pid) => owners.get(pid)), ['session:100', 'session:100', 'session:100', 'agent:a1', 'agent:a1', null]);
});

test('usageOf: cpu in percent of a core, memory in MB, processes counted; null for an owner with none, and when stale', () => {
  let now = 10_000;
  const store = new UsageStore(() => now);
  assert.equal(store.usageOf('session:100'), null, 'no snapshot yet');
  store.record(snap(1, TREE), P);
  assert.deepEqual(store.usageOf('session:100'), { cpu: 185, rssMb: 900, procs: 3 });
  assert.deepEqual(store.usageOf('agent:a1'), { cpu: 300, rssMb: 50, procs: 2 });
  assert.equal(store.usageOf('agent:none'), null);
  assert.deepEqual(Object.keys(usageByOwner(snap(1, TREE), P)).sort(), ['agent:a1', 'session:100']);
  now += 11_000;
  assert.equal(store.usageOf('session:100'), null, 'a snapshot older than 10 s is not what the machine is doing');
  assert.deepEqual(store.all(), {});
});

test('a sampler line is parsed, and a line that is not one is not', () => {
  const line = toJson({ at: 5, dt: 2000, self: 7, source: 'native', procs: [{ pid: 1, ppid: 0, cpu: 0.5, rss: 10, comm: 'x', cwd: '/', orphan: true }, { nope: 1 }] });
  const s = parseSnapshot(line);
  assert.equal(s?.procs.length, 1);
  assert.equal(s?.procs[0]?.orphan, true);
  assert.equal(parseSnapshot('garbage'), null);
  assert.equal(parseSnapshot('{"at":1}'), null);
});

function dog(over: Partial<WatchdogOptions> = {}): { dog: Watchdog; log: string[]; kills: string[] } {
  const log: string[] = [];
  const kills: string[] = [];
  const d = new Watchdog({ orphanMs: 60_000, testMs: 15_000, project: P, cap: () => 2, stop: () => false, kill: (pid, sig) => { kills.push(`${pid} ${sig}`); }, log: (l) => log.push(l), ...over });
  return { dog: d, log, kills };
}
const spinner = (cpu = 1): Proc => proc(201, 1, { comm: 'node', cwd: `${P}/.claude/worktrees/a1`, cpu, orphan: true });

test('an orphan holding a core: flagged after 60 s, not before, and left running without the guard', () => {
  const { dog: d, log, kills } = dog();
  for (let at = 0; at <= 58_000; at += 2000) d.observe(snap(at, [spinner()]));
  assert.deepEqual(d.flags(), [], 'not yet');
  d.observe(snap(60_000, [spinner()]));
  const [flag] = d.flags();
  assert.deepEqual([flag?.kind, flag?.pid, flag?.owner, flag?.stopped], ['orphan-spinner', 201, 'agent:a1', false]);
  assert.match(log.join('\n'), /orphan spinner pid 201 .* for 60 s .*guards\.watchdog\.stop is not set/);
  assert.deepEqual(kills, []);
});

test('a dip below a core resets the clock; a child with a live parent, a claude process and a cool orphan are never flagged', () => {
  const { dog: d } = dog();
  for (let at = 0; at < 50_000; at += 2000) d.observe(snap(at, [spinner()]));
  d.observe(snap(50_000, [spinner(0.1)]));
  for (let at = 52_000; at <= 100_000; at += 2000) d.observe(snap(at, [spinner()]));
  assert.deepEqual(d.flags(), [], 'the run began again at 52 s');
  const other = dog();
  for (let at = 0; at <= 120_000; at += 2000) other.dog.observe(snap(at, [proc(5, 4, { cpu: 3, comm: 'node' }), proc(6, 1, { claude: true, orphan: true, cpu: 3 }), proc(7, 1, { orphan: true, cpu: 0.3 })]));
  assert.deepEqual(other.dog.flags(), []);
});

test('with the guard set: SIGTERM at the flag, SIGKILL 5 s later when it is still there, the flag goes when it does', () => {
  const { dog: d, log, kills } = dog({ stop: () => true });
  for (let at = 0; at <= 60_000; at += 2000) d.observe(snap(at, [spinner()]));
  assert.deepEqual(kills, ['201 SIGTERM']);
  assert.equal(d.flags()[0]?.stopped, true);
  d.observe(snap(64_000, [spinner()]));
  assert.deepEqual(kills, ['201 SIGTERM']);
  d.observe(snap(66_000, [spinner()]));
  d.observe(snap(68_000, [spinner()]));
  assert.deepEqual(kills, ['201 SIGTERM', '201 SIGKILL']);
  d.observe(snap(70_000, []));
  assert.deepEqual(d.flags(), []);
  assert.match(log.join('\n'), /stopped orphan spinner pid 201[\s\S]*survived SIGTERM[\s\S]*pid 201 .* is gone/);
});

const runOf = (cpus: number[]): Proc[] => [
  proc(10, 100, { comm: 'node', args: 'node --import x --test --test-concurrency=2 a.test.mts', cpu: 0.2 }),
  ...cpus.map((cpu, i) => proc(11 + i, 10, { comm: 'node', args: `node a${i}.test.mts`, cpu })),
];

test('a test run over the cap (plus a core for the runner) for 15 s is flagged, and never stopped', () => {
  const { dog: d, log, kills } = dog({ stop: () => true });
  for (let at = 0; at <= 20_000; at += 2000) d.observe(snap(at, runOf([1, 1])));
  assert.deepEqual(d.flags(), [], 'two files at once on a cap of 2: within it');
  for (let at = 22_000; at <= 34_000; at += 2000) d.observe(snap(at, runOf([1, 1, 1, 1])));
  assert.deepEqual(d.flags(), [], 'not for 15 s yet');
  d.observe(snap(38_000, runOf([1, 1, 1, 1])));
  const [flag] = d.flags();
  assert.deepEqual([flag?.kind, flag?.pid, flag?.cap, flag?.stopped, flag?.cores], ['test-over-cap', 10, 2, false, 4.2]);
  assert.match(log.join('\n'), /test run pid 10 holds 4\.20 cores, over the test cap of 2/);
  assert.deepEqual(kills, []);
  d.observe(snap(40_000, []));
  assert.deepEqual(d.flags(), []);
});
