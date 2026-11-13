// runs alone: it asserts a p50 in milliseconds over the daemon, which other test files running at once double (KWB-219)
// `claude-packs load` (typescript order W8.8 item 0): the question every lead and agent asks before a heavy start, through the real
// command line, on a governor folder of its own with 18 planted cores and a planted load.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CLI, KIT, assert, fresh, spawnSync, test } from '../kit-cli.mts';
import { percentile } from '../../lib/hook-budget.mts';
import { hostTarget, shippedBinary } from '../../lib/proxy-binary.mts';
import { stopDaemon, until } from '../fixtures/proxy-rig.mts';
import { fire, pidOf, proxyRig } from './proxy-fire-rig.mts';
import type { Spawned } from '../kit-cli.mts';
import { main } from '../../packs/base/tools/load.mts';
import { machineHost } from '../../packs/base/hooks/lib/governor.mts';

/** The answer must come in this long, the order's Done when. */
const ANSWER_MS = 50;
const ASKS = 20;

const load = (governor: string, planted: string, ...args: string[]): Spawned =>
  spawnSync('node', [CLI, 'load', ...args], { encoding: 'utf8',
    env: { ...process.env, CLAUDE_PACKS_GOVERNOR_DIR: governor, CLAUDE_PACKS_GOVERNOR_CORES: '18', CLAUDE_PACKS_GOVERNOR_LOAD: planted } });

/** A pid that was alive and is gone: a child that has exited. */
const deadPid = (): number => {
  const r = spawnSync('node', ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });
  return Number(r.stdout);
};

test('load ask prints one line with the cores, the settings per kind and the load, and exits 0', () => {
  const r = load(fresh('load-ask-'), '9.2', 'ask');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^you may use 3 cores now \(tests: CLAUDE_PACKS_TEST_CORES=3; builds: -j3; fuzz: -parallel=2; agents: 1 more\); load 9\.2 of 18, ceiling 13, 0 jobs running; priority 0\.5\n$/);
});

test('load ask --json gives the same answer as data', () => {
  const r = load(fresh('load-json-'), '2', 'ask', '--for', 'build', '--want', '4', '--json');
  assert.equal(r.status, 0, r.stderr);
  const answer = JSON.parse(r.stdout) as { go: boolean; grant: number; settings: { flags: string[] }; budget: { slots: number } };
  assert.equal(answer.go, true);
  assert.equal(answer.grant, 4);
  assert.deepEqual(answer.settings.flags, ['-j4']);
  assert.equal(answer.budget.slots, 10);
});

test('load ask answers in under 50 ms, the median of 20 asks after the command is loaded', () => {
  const governor = fresh('load-fast-');
  const host = machineHost({ CLAUDE_PACKS_GOVERNOR_DIR: governor, CLAUDE_PACKS_GOVERNOR_CORES: '18', CLAUDE_PACKS_GOVERNOR_LOAD: '4' });
  const quiet = console.log;
  const times: number[] = [];
  console.log = (): void => undefined;
  try {
    for (let i = 0; i < ASKS; i += 1) {
      const began = performance.now();
      main(['ask', '--for', 'test'], { env: {}, cwd: governor, ppid: process.pid }, host);
      times.push(performance.now() - began);
    }
  } finally {
    console.log = quiet;
  }
  const median = [...times].sort((a, b) => a - b)[Math.floor(ASKS / 2)] ?? Infinity;
  assert.ok(median < ANSWER_MS, `median ${median.toFixed(2)} ms`);
});

test('load ask says wait under a load over the ceiling, and exits 1', () => {
  const r = load(fresh('load-wait-'), '14.1', 'ask', '--for', 'test');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^wait: load 14\.1 over the ceiling 13; 0 cores free; ask again in a minute/);
});

test('two load takes that together exceed the budget: the second is refused until the first is freed', () => {
  const governor = fresh('load-take-');
  const first = load(governor, '0', 'take', '6', '--for', 'build', '--priority', '0.6', '--pid', String(process.pid));
  assert.equal(first.status, 0, first.stderr);
  const id = first.stdout.match(/^granted (\S+):/)?.[1] ?? '';
  assert.match(first.stdout, /6 cores at priority 0\.6 \(tests: CLAUDE_PACKS_TEST_CORES=6; builds: -j6/);
  const second = load(governor, '0', 'take', '6', '--for', 'build', '--priority', '0.6', '--pid', String(process.pid));
  assert.equal(second.status, 1);
  assert.match(second.stdout, /^wait: 6 wanted, 4 free .*ask again after the running build ends/);
  assert.equal(load(governor, '0', 'free', id).status, 0);
  assert.equal(load(governor, '0', 'take', '6', '--for', 'build', '--priority', '0.6', '--pid', String(process.pid)).status, 0);
  assert.equal(load(governor, '0', 'free', 'g-none').status, 1, 'an id nobody holds');
});

test('a grant whose pid is gone is freed on the next ask', () => {
  const governor = fresh('load-stale-');
  assert.equal(load(governor, '0', 'take', '10', '--for', 'test', '--priority', '1', '--pid', String(deadPid())).status, 0);
  const r = load(governor, '0', 'ask', '--json');
  const answer = JSON.parse(r.stdout) as { running: number; free: number };
  assert.equal(answer.running, 0);
  assert.equal(answer.free, 10);
});

test('a --priority 0.3 take on a 10-core budget is granted 3 cores, and CLAUDE_PACKS_PRIORITY is the priority when none is given', () => {
  const governor = fresh('load-priority-');
  const r = load(governor, '0', 'take', '8', '--for', 'build', '--priority', '0.3', '--pid', String(process.pid), '--json');
  assert.equal(r.status, 0, r.stderr);
  const grant = JSON.parse(r.stdout) as { slots: number; priority: number };
  assert.deepEqual([grant.slots, grant.priority], [3, 0.3]);
  const asked = spawnSync('node', [CLI, 'load', 'ask'], { encoding: 'utf8', env: { ...process.env, CLAUDE_PACKS_GOVERNOR_DIR: governor,
    CLAUDE_PACKS_GOVERNOR_CORES: '18', CLAUDE_PACKS_GOVERNOR_LOAD: '0', CLAUDE_PACKS_PRIORITY: '0.2' } });
  assert.match(asked.stdout, /^you may use 2 cores now .*; priority 0\.2\n$/);
});

test('a wrong word says how to use it and exits 2', () => {
  assert.equal(load(fresh('load-usage-'), '0', 'ask', '--for', 'lunch').status, 2);
  assert.match(load(fresh('load-usage-'), '0', 'grab').stderr, /^usage: load ask/);
});

/** Asks end to end through the Go client: the picker, the binary, the daemon's socket, the tool's answer, as an agent asks. */
const ASKS_END_TO_END = 100;
const target = hostTarget();
const proxySkip = target !== null && existsSync(shippedBinary(KIT, target)) ? false : 'no proxy binary is built here (Go is not on PATH)';

test('hook-proxy load ask answers in under 50 ms end to end, p50 of 100 asks through the picker and the daemon', { skip: proxySkip, timeout: 300_000 }, async () => {
  const r = proxyRig('load-proxy-');
  const governor = fresh('load-proxy-gov-');
  const env = { ...r.env, CLAUDE_PACKS_GOVERNOR_DIR: governor, CLAUDE_PACKS_GOVERNOR_CORES: '18', CLAUDE_PACKS_GOVERNOR_LOAD: '9.2' };
  const picker = join(r.project, '.claude', 'hooks', 'bin', 'hook-proxy');
  try {
    fire(r, JSON.stringify({ session_id: 's', cwd: r.project, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } }));
    await until('a daemon is listening', () => pidOf(r) > 0);
    const times: number[] = [];
    let last: Spawned | null = null;
    for (let i = 0; i < ASKS_END_TO_END; i += 1) {
      const began = performance.now();
      last = spawnSync('sh', [picker, 'load', 'ask', '--for', 'test'], { env, cwd: r.project, encoding: 'utf8' });
      times.push(performance.now() - began);
    }
    assert.equal(last?.status, 0, last?.stderr);
    assert.match(last?.stdout ?? '', /^you may use 3 cores now \(tests: CLAUDE_PACKS_TEST_CORES=3; .*load 9\.2 of 18, ceiling 13/);
    const line = `load ask end to end: p50 ${percentile(times, 50).toFixed(1)} p95 ${percentile(times, 95).toFixed(1)} max ${Math.max(...times).toFixed(1)} ms over ${ASKS_END_TO_END}`;
    console.log(line);
    assert.ok(percentile(times, 50) < ANSWER_MS, line);
    const wait = spawnSync('sh', [picker, 'load', 'ask', '--for', 'test'], { env: { ...env, CLAUDE_PACKS_GOVERNOR_LOAD: '14.1' }, cwd: r.project, encoding: 'utf8' });
    assert.equal(wait.status, 1, 'wait under a planted load over the ceiling exits 1 through the client too');
    assert.match(wait.stdout, /^wait: load 14\.1 over the ceiling 13/);
  } finally { stopDaemon(r); }
});

test('hook-proxy load ask with no daemon answers through the TypeScript tool, the same answer', { skip: proxySkip }, () => {
  const r = proxyRig('load-nodaemon-');
  const env = { ...r.env, CLAUDE_PACKS_GOVERNOR_DIR: fresh('load-nod-gov-'), CLAUDE_PACKS_GOVERNOR_CORES: '18', CLAUDE_PACKS_GOVERNOR_LOAD: '9.2', CLAUDE_PACKS_DAEMON: 'off' };
  const asked = spawnSync('sh', [join(r.project, '.claude', 'hooks', 'bin', 'hook-proxy'), 'load', 'ask', '--json'], { env, cwd: r.project, encoding: 'utf8' });
  assert.equal(asked.status, 0, asked.stderr);
  assert.equal((JSON.parse(asked.stdout) as { load: number }).load, 9.2);
  // no binary for this machine: the picker gives every word to the TypeScript tool itself
  const bare = spawnSync('sh', [join(r.project, '.claude', 'hooks', 'bin', 'hook-proxy'), 'load', 'ask', '--json'],
    { env: { ...env, CLAUDE_PACKS_CACHE: fresh('load-nobin-') }, cwd: r.project, encoding: 'utf8' });
  assert.equal(bare.status, 0, bare.stderr);
  assert.equal((JSON.parse(bare.stdout) as { load: number }).load, 9.2);
});
