// `claude-packs load` (typescript order W8.8 item 0): the question every lead and agent asks before a heavy start, through the real
// command line, on a governor folder of its own with 18 planted cores and a planted load.
import { CLI, assert, fresh, spawnSync, test } from '../kit-cli.mts';
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
