// governed (typescript order W8.8 item 3): a heavy command run through the load governor, through the real tool, each run on a governor
// folder of its own with planted cores and load. The order's Done when: two planted heavy jobs whose weights exceed the budget run one
// after the other, never together; a job granted 3 slots runs with CLAUDE_PACKS_TEST_CORES=3 and -j3; a killed job's slots are freed on
// the next read; and governed exits with the command's own code.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { assert, fresh, test } from '../../kit-cli.mts';
import { inFlight, machineHost, take } from '../../../packs/base/hooks/lib/governor.mts';
import { HOLD_MS, Pauser, RESUME_GAP_MS } from '../../../packs/base/hooks/resident/governor-pause.mts';
import { settingsFor } from '../../../packs/base/hooks/lib/governor-settings.mts';
import { grantedEnv, lowPriority, withFlags } from '../../../packs/base/tools/governed.mts';

const TOOL = fileURLToPath(new URL('../../../packs/base/tools/governed.mjs', import.meta.url));

/** A planted machine: `cores` at load 0, its governor folder its own. 10 cores give a budget of 6 slots. */
const planted = (cores = '10'): Record<string, string> => ({ CLAUDE_PACKS_GOVERNOR_DIR: fresh('governed-'), CLAUDE_PACKS_GOVERNOR_CORES: cores,
  CLAUDE_PACKS_GOVERNOR_LOAD: '0', CLAUDE_PACKS_PRIORITY: '1' });

/** governed run to its end, beside the test. */
function governedRun(env: Record<string, string>, args: readonly string[]): Promise<{ code: number | null; stderr: string }> {
  return new Promise((done) => {
    const child = spawn('node', [TOOL, ...args], { env: { ...process.env, ...env }, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf8'); });
    child.on('exit', (code) => done({ code, stderr }));
  });
}

/** A job that records its start and end in `log` and holds for `ms`. */
const recorder = (log: string, name: string, ms: number): string[] => ['node', '-e',
  `const f=require('fs');f.appendFileSync(${JSON.stringify(log)},'${name} start '+Date.now()+'\\n');setTimeout(()=>f.appendFileSync(${JSON.stringify(log)},'${name} end '+Date.now()+'\\n'),${ms})`];

test('two planted heavy jobs whose weights exceed the budget run one after the other, never together', async () => {
  const env = planted();
  const log = join(fresh('governed-log-'), 'log');
  const HOLD_MS = 700;
  const [a, b] = await Promise.all([
    governedRun(env, ['--for', 'build', '--want', '4', '--', ...recorder(log, 'a', HOLD_MS)]),
    governedRun(env, ['--for', 'build', '--want', '4', '--', ...recorder(log, 'b', HOLD_MS)]),
  ]);
  assert.equal(a.code, 0, a.stderr);
  assert.equal(b.code, 0, b.stderr);
  const at = Object.fromEntries(readFileSync(log, 'utf8').trim().split('\n').map((l) => { const [n, w, t] = l.split(' '); return [`${n} ${w}`, Number(t)]; }));
  const [first, second] = (at['a start'] ?? 0) < (at['b start'] ?? 0) ? ['a', 'b'] : ['b', 'a'];
  assert.ok((at[`${second} start`] ?? 0) >= (at[`${first} end`] ?? Infinity), `the second started before the first ended: ${JSON.stringify(at)}`);
  assert.match(a.stderr + b.stderr, /governed: waiting \d+ s for .*wait: 4 wanted/, 'the one that waited said so, once, on stderr');
  assert.deepEqual(inFlight(machineHost(env)).jobs, [], 'both grants were freed');
});

test('a job granted 3 slots runs with CLAUDE_PACKS_TEST_CORES=3 and -j3', () => {
  const env = planted();
  const r = spawnSync('node', [TOOL, '--for', 'test', '--want', '3', '--', 'sh', '-c', 'echo "$CLAUDE_PACKS_TEST_CORES $MAKEFLAGS $CMAKE_BUILD_PARALLEL_LEVEL $GOMAXPROCS"'],
    { env: { ...process.env, ...env }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '3 -j3 3 3');
  const grant = { id: 'g1', kind: 'build' as const, slots: 3, settings: settingsFor('build', 3) };
  assert.deepEqual(withFlags(['make', 'all'], grant), ['make', '-j3', 'all']);
  assert.deepEqual(withFlags(['make', '-j16'], grant), ['make', '-j3']);
  assert.deepEqual(withFlags(['ninja', '-C', 'b'], grant), ['ninja', '-j3', '-C', 'b']);
  const fuzz = { id: 'g2', kind: 'fuzz' as const, slots: 3, settings: settingsFor('fuzz', 3) };
  assert.deepEqual(withFlags(['go', 'test', '-fuzz=F', '-parallel', '8', './p'], fuzz), ['go', 'test', '-fuzz=F', './p', '-parallel=2']);
  assert.deepEqual(withFlags(['node', '--test', 'a.test.mts'], { ...grant, kind: 'test' }), ['node', '--test-concurrency=3', '--test', 'a.test.mts']);
  assert.deepEqual(withFlags(['node', '--test', '--test-concurrency=6', 'a.test.mts'], { ...grant, kind: 'test' }), ['node', '--test', '--test-concurrency=3', 'a.test.mts'], 'a higher concurrency asked for is cut to the grant');
  assert.equal(grantedEnv({ CLAUDE_PACKS_TEST_CORES: '2' }, grant)['CLAUDE_PACKS_TEST_CORES'], '2', 'a lower count the caller set is kept');
  assert.deepEqual(lowPriority(['make'], 'darwin'), ['nice', '-n', '15', 'make']);   // every core, never background QoS (KWB-149)
  assert.deepEqual(lowPriority(['make'], 'linux'), ['nice', '-n', '15', 'make']);
});

test('governed exits with the command\'s own code and runs it in a process group of its own', () => {
  const env = planted();
  const r = spawnSync('node', [TOOL, '--for', 'build', '--', 'sh', '-c', 'ps -o pgid= -p $$; exit 7'], { env: { ...process.env, ...env }, encoding: 'utf8' });
  assert.equal(r.status, 7);
  assert.notEqual(Number(r.stdout.trim()), process.pid);
  assert.equal(spawnSync('node', [TOOL, '--for', 'nope', '--', 'true'], { env: { ...process.env, ...env } }).status, 2, 'a wrong kind is a usage fault');
});

test('a killed job\'s slots are freed on the next read', async () => {
  const env = planted();
  const host = machineHost(env);
  const child = spawn('node', [TOOL, '--for', 'build', '--want', '2', '--', 'sleep', '30'], { env: { ...process.env, ...env }, stdio: 'ignore' });
  const GRANTED_WITHIN_MS = 5000;
  const STEP_MS = 100;
  let group: number | null = null;
  try {
    const began = Date.now();
    while ((inFlight(host).jobs[0]?.pgid ?? null) === null && Date.now() - began < GRANTED_WITHIN_MS) await delay(STEP_MS);
    group = inFlight(host).jobs[0]?.pgid ?? null;
    assert.ok(group !== null, 'the job holds its grant, with its process group');
    child.kill('SIGKILL');
    await new Promise((r) => child.once('exit', r));
    assert.deepEqual(inFlight(host).jobs, [], 'the grant of a pid that is gone is dropped on read');
  } finally {
    child.kill('SIGKILL');
    // the sleep's own group outlives governed's kill: the teardown ends it whatever happened
    if (group !== null) try { process.kill(-group, 'SIGKILL'); } catch { /* already gone */ }
  }
});

/** A spinner in a process group of its own: a governed job's command, as the watchdog finds it. */
const spinner = (): number => {
  const child = spawn('sh', ['-c', 'while :; do :; done'], { detached: true, stdio: 'ignore' });
  child.unref();
  return child.pid ?? 0;
};
/** A process's state letter from ps: T when it is stopped. */
const stateOf = (pid: number): string => spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim().slice(0, 1);

test('planted spinner jobs over the ceiling for 30 s: the lowest priority paused first, the oldest never, resumed when the load falls', () => {
  const env = planted('10');
  let now = 1_000_000;
  let load = 0;
  const host = { ...machineHost(env), now: () => now, load: () => load };
  const groups = [spinner(), spinner(), spinner()];
  const lines: string[] = [];
  try {
    // the oldest job holds priority 0.1: still never paused; then 0.3 and 0.8
    const [oldest, low, high] = [0.1, 0.3, 0.8].map((priority, i) => {
      now += 1000;
      const r = take(host, { kind: 'test', want: 1, priority, pid: process.pid, pgid: groups[i] ?? 0 });
      assert.ok(r.ok);
      return r.grant.id;
    });
    const pauser = new Pauser({ host, self: process.pid, log: (l) => lines.push(l), signal: (pgid, sig) => process.kill(-pgid, sig) });
    const paused = (): string[] => inFlight(host).jobs.filter((j) => j.pausedAt !== null).map((j) => j.id);
    load = 9;   // the ceiling on 10 cores is 7
    pauser.observe();
    now += HOLD_MS - 1;
    pauser.observe();
    assert.deepEqual(paused(), [], 'nothing is paused before the load has held for 30 s');
    now += 1;
    pauser.observe();
    assert.deepEqual(paused(), [low], 'the lowest priority (but the oldest) is paused first');
    assert.equal(stateOf(groups[1] ?? 0), 'T', 'its process group is stopped');
    now += HOLD_MS;
    pauser.observe();
    assert.deepEqual(paused().sort(), [low, high].sort(), 'then the highest');
    now += HOLD_MS;
    pauser.observe();
    assert.deepEqual(paused().sort(), [low, high].sort(), 'the oldest job is never paused');
    assert.notEqual(stateOf(groups[0] ?? 0), 'T');
    load = 6.5;   // under the ceiling, not under it less 10 %: still paused
    now += RESUME_GAP_MS;
    pauser.observe();
    assert.equal(paused().length, 2);
    load = 5;
    pauser.observe();
    assert.deepEqual(paused(), [low], 'the highest priority is resumed first');
    assert.notEqual(stateOf(groups[2] ?? 0), 'T');
    now += RESUME_GAP_MS;
    pauser.observe();
    assert.deepEqual(paused(), []);
    assert.notEqual(stateOf(groups[1] ?? 0), 'T', 'pausing, never killing: the spinner runs on');
    assert.ok(lines.some((l) => l.includes(`paused ${low}`)) && lines.some((l) => l.includes(`resumed ${high}`)), lines.join('\n'));
    assert.ok(oldest !== undefined);
  } finally {
    for (const g of groups) try { process.kill(-g, 'SIGKILL'); } catch { /* gone */ }
  }
});
