// governor.mts (typescript order W8.8 items 0b, 1 and 2): the machine's one owner of "how many cores may this job use now". Every case
// runs on a planted host (its own folder, cores, load, clock and live pids), so no test reads the machine's real load or another
// session's jobs.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { AGING_EVERY_MS, ask, budgetOf, free, inFlight, pauseOrder, queueUp, resumeOrder, setPaused, take } from '../../../packs/base/hooks/lib/governor.mts';
import type { GovernorHost, Job, TakeResult } from '../../../packs/base/hooks/lib/governor.mts';
import { settingsFor } from '../../../packs/base/hooks/lib/governor-settings.mts';
import { changeState } from '../../../packs/base/hooks/lib/governor-store.mts';

const START_MS = 1_000_000;

interface Planted extends GovernorHost { dead: Set<number>; at: (ms: number) => void }

/** A planted machine: 18 cores by default, the load given, a clock that stands still until moved, every pid alive but `dead`. */
function planted(load = 2, cores = 18): Planted {
  const dir = scratchDir('governor-');
  let now = START_MS;
  const dead = new Set<number>();
  return {
    env: { CLAUDE_PACKS_GOVERNOR_DIR: join(dir, 'state'), XDG_CONFIG_HOME: join(dir, 'config') },
    home: dir, cores, dead,
    load: () => load,
    now: () => now,
    at: (ms) => { now = START_MS + ms; },
    alive: (pid) => !dead.has(pid),
  };
}

const machineFile = (host: GovernorHost): string => join(String(host.env['XDG_CONFIG_HOME']), 'claude-packs', 'governor.json');

const granted = (r: TakeResult): { id: string; slots: number } => {
  if (!r.ok) throw new Error(`refused: ${r.answer.line}`);
  return { id: r.grant.id, slots: r.grant.slots };
};

test('the budget is 60 % of the cores in slots and a ceiling of 70 %: 10 slots and 13 on 18 cores', () => {
  assert.deepEqual(budgetOf(planted()), { cores: 18, slots: 10, ceiling: 13 });
});

test('the machine file sets the budget as a share, a count or a percentage, and a project may lower it, never raise it', () => {
  const host = planted();
  put(machineFile(host), '{ "budget": 0.5, "ceiling": 12 }');
  assert.deepEqual(budgetOf(host), { cores: 18, slots: 9, ceiling: 12 });
  put(machineFile(host), '{ "budget": "25%" }');
  assert.equal(budgetOf(host).slots, 4);
  put(machineFile(host), '{ "budget": 8 }');
  const project = scratchDir('governor-project-');
  put(join(project, '.claude', 'layout.json'), '{ "guards": { "governor": { "budget": 3 } } }');
  assert.equal(budgetOf(host, project).slots, 3, 'a project lowers it');
  put(join(project, '.claude', 'layout.json'), '{ "guards": { "governor": { "budget": 16 } } }');
  assert.equal(budgetOf(host, project).slots, 8, 'and never raises it');
});

test('the last 20 % of the cores is never granted: a planted budget of 100 % is clamped to 80 %, the ceiling too', () => {
  const host = planted(0, 10);
  put(machineFile(host), '{ "budget": 1, "ceiling": "100%" }');
  assert.deepEqual(budgetOf(host), { cores: 10, slots: 8, ceiling: 8 });
  const r = take(host, { kind: 'build', want: 10, priority: 1, pid: 51 });
  assert.equal(granted(r).slots, 8, 'all of it is 8 of 10');
  assert.equal(take(host, { kind: 'test', want: 1, priority: 1, pid: 52 }).ok, false, 'the last two cores are the machine\'s');
});

test('ask answers with the cores free now, the settings per kind, the load and the priority it answered for', () => {
  const a = ask(planted(9.2), { kind: 'test', want: 3 });
  assert.equal(a.go, true);
  assert.equal(a.free, 3, 'the ceiling 13 less the load 9.2 leaves 3 whole cores, under the 10 free slots');
  assert.match(a.line, /^you may use 3 cores now \(tests: CLAUDE_PACKS_TEST_CORES=3; builds: -j3; fuzz: -parallel=2; agents: 1 more\); load 9\.2 of 18, ceiling 13, 0 jobs running; priority 0\.5$/);
});

test('ask says wait under a load over the ceiling, with the reason and when to ask again', () => {
  const a = ask(planted(14.1), { kind: 'test' });
  assert.equal(a.go, false);
  assert.match(a.line, /^wait: load 14\.1 over the ceiling 13; 0 cores free; ask again .*; priority 0\.5$/);
});

test('a --priority 0.3 take on a 10-core budget is granted at most 3 cores, and any priority at least 1', () => {
  const host = planted(0);
  assert.equal(granted(take(host, { kind: 'build', want: 8, priority: 0.3, pid: 61 })).slots, 3);
  assert.equal(granted(take(host, { kind: 'build', priority: 0.3, pid: 62, upTo: 9 })).slots, 3);
  assert.equal(granted(take(host, { kind: 'test', want: 4, priority: 0, pid: 63 })).slots, 1, 'none starves');
});

test('two takes that together exceed the budget: the second is refused until the first is freed', () => {
  const host = planted(0);
  const first = granted(take(host, { kind: 'build', want: 6, priority: 0.6, pid: 101 }));
  const second = take(host, { kind: 'build', want: 6, priority: 0.6, pid: 102 });
  assert.equal(second.ok, false, 'six and six are over the ten slots');
  assert.match(second.ok ? '' : second.answer.line, /^wait: 6 wanted, 4 free/);
  assert.equal(free(host, first.id), true);
  granted(take(host, { kind: 'build', want: 6, priority: 0.6, pid: 102 }));
});

test('a grant whose pid is gone is freed on the next read: ask sees its slots free and the next write drops it', () => {
  const host = planted(0);
  granted(take(host, { kind: 'test', want: 10, priority: 1, pid: 201 }));
  assert.equal(ask(host, { want: 1 }).go, false, 'every slot is held');
  host.dead.add(201);
  const a = ask(host, { want: 1 });
  assert.equal(a.go, true);
  assert.equal(a.running, 0);
  granted(take(host, { kind: 'test', want: 10, priority: 1, pid: 202 }));
  assert.deepEqual(inFlight(host).jobs.map((j) => j.pid), [202], 'the dead holder is gone from the file');
});

test('a job granted 3 slots is started with CLAUDE_PACKS_TEST_CORES=3 and -j3', () => {
  const r = take(planted(0), { kind: 'build', want: 3, pid: 301 });
  assert.ok(r.ok);
  assert.equal(r.grant.slots, 3);
  assert.equal(r.grant.settings.env['CLAUDE_PACKS_TEST_CORES'], '3');
  assert.equal(r.grant.settings.env['CMAKE_BUILD_PARALLEL_LEVEL'], '3');
  assert.equal(r.grant.settings.env['GOMAXPROCS'], '3');
  assert.deepEqual(r.grant.settings.flags, ['-j3']);
});

test('settingsFor gives each kind its own flags: --test-concurrency, -j, and -parallel one under the slots for a fuzzer', () => {
  assert.deepEqual(settingsFor('test', 4).flags, ['--test-concurrency=4']);
  assert.deepEqual(settingsFor('fuzz', 3).flags, ['-parallel=2']);
  assert.deepEqual(settingsFor('fuzz', 1).flags, ['-parallel=1']);
  assert.equal(settingsFor('agent', 6).agents, 2);
  assert.equal(settingsFor('test', 0).slots, 1, 'never under one');
});

test('a take with no want gets what is free up to its priority\'s share and its upTo', () => {
  const host = planted(0);
  assert.equal(granted(take(host, { kind: 'build', priority: 0.8, pid: 401, upTo: 8 })).slots, 8);
  assert.equal(granted(take(host, { kind: 'build', priority: 0.8, pid: 402, upTo: 8 })).slots, 2, 'the two left');
});

test('of two asks waiting, the higher priority is granted first, though it queued later', () => {
  const host = planted(0);
  const big = granted(take(host, { kind: 'build', want: 8, priority: 0.8, pid: 501 }));
  const low = queueUp(host, { kind: 'test', want: 2, priority: 0.3, pid: 502 });
  host.at(1000);
  const high = queueUp(host, { kind: 'build', want: 2, priority: 0.7, pid: 503 });
  assert.equal(take(host, { kind: 'test', want: 2, priority: 0.3, pid: 502, ticket: low }).ok, false, 'the two free cores are held for the higher');
  granted(take(host, { kind: 'build', want: 2, priority: 0.7, pid: 503, ticket: high }));
  free(host, big.id);
  granted(take(host, { kind: 'test', want: 2, priority: 0.3, pid: 502, ticket: low }));
  assert.equal(inFlight(host).waiting.length, 0, 'each ticket left the queue when granted');
});

test('a low-priority ask waiting 15 minutes rises to its aged priority and is granted before a fresher, higher one', () => {
  const host = planted(0);
  granted(take(host, { kind: 'build', want: 7, priority: 0.7, pid: 601 }));
  const low = queueUp(host, { kind: 'test', want: 3, priority: 0.2, pid: 602 });
  host.at(3 * AGING_EVERY_MS);
  const fresh = queueUp(host, { kind: 'test', want: 3, priority: 0.4, pid: 603 });
  assert.equal(ask(host, { priority: 0.4 }).go, false, 'the three free cores are held for the aged waiter');
  const r = take(host, { kind: 'test', want: 3, priority: 0.2, pid: 602, ticket: low });
  assert.ok(r.ok);
  assert.equal(r.grant.priority, 0.5, '0.2 and 0.1 for each of three five-minute waits');
  assert.equal(take(host, { kind: 'test', want: 3, priority: 0.4, pid: 603, ticket: fresh }).ok, false);
});

test('under load the lowest priority of three running jobs is paused first and the highest last, and resumed the other way', () => {
  const job = (id: string, priority: number, start: number, pausedAt: number | null = null): Job =>
    ({ id, pid: 1, pgid: null, kind: 'test', slots: 1, priority, project: '', start, pausedAt, command: '' });
  const running = [job('mid', 0.5, 1), job('high', 0.8, 2), job('low', 0.2, 3)];
  assert.deepEqual(pauseOrder(running).map((j) => j.id), ['low', 'mid', 'high']);
  const paused = [job('low', 0.2, 1, 10), job('high', 0.8, 2, 30), job('mid', 0.5, 3, 20)];
  assert.deepEqual(resumeOrder(paused).map((j) => j.id), ['high', 'mid', 'low']);
});

test('a paused job is counted as paused until it runs again', () => {
  const host = planted(0);
  const { id } = granted(take(host, { kind: 'fuzz', want: 2, pid: 701 }));
  assert.equal(setPaused(host, id, 5), true);
  assert.equal(ask(host).paused, 1);
  assert.equal(setPaused(host, id, null), true);
  assert.equal(ask(host).paused, 0);
  assert.equal(setPaused(host, 'g-none', 5), false);
});

test('a lock left by a dead holder is broken, and the change goes through', () => {
  const host = planted(0);
  const dir = String(host.env['CLAUDE_PACKS_GOVERNOR_DIR']);
  put(join(dir, 'jobs.lock', 'pid'), '801\n');
  host.dead.add(801);
  assert.equal(changeState(dir, host.alive, () => 'changed'), 'changed');
});
