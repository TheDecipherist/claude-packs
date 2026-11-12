// governor.mts (typescript order W8.8 items 1 and 2): the machine's one owner of "how many cores may this job use now". Every case runs
// on a planted host (its own folder, cores, load and live pids), so no test reads the machine's real load or another session's jobs.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { ask, budgetOf, free, inFlight, queueUp, setPaused, take } from '../../../packs/base/hooks/lib/governor.mts';
import type { GovernorHost, TakeResult } from '../../../packs/base/hooks/lib/governor.mts';
import { settingsFor } from '../../../packs/base/hooks/lib/governor-settings.mts';
import { changeState } from '../../../packs/base/hooks/lib/governor-store.mts';

/** A planted machine: 18 cores, the load `load` says, every pid alive but those in `dead`. */
function planted(load = 2, cores = 18): GovernorHost & { dead: Set<number>; setLoad: (n: number) => void } {
  const dir = scratchDir('governor-');
  let now = 1_000_000;
  let current = load;
  const dead = new Set<number>();
  return {
    env: { CLAUDE_PACKS_GOVERNOR_DIR: join(dir, 'state'), XDG_CONFIG_HOME: join(dir, 'config') },
    home: dir, cores, dead,
    load: () => current,
    setLoad: (n) => { current = n; },
    now: () => (now += 1000),
    alive: (pid) => !dead.has(pid),
  };
}

const granted = (r: TakeResult): string => {
  assert.ok(r.ok, r.ok ? '' : r.answer.line);
  return r.grant.id;
};

test('the budget is 60 % of the cores in slots and a ceiling of 70 %: 10 slots and 13 on 18 cores', () => {
  assert.deepEqual(budgetOf(planted()), { cores: 18, slots: 10, ceiling: 13 });
});

test('the machine file sets the budget as a share, a count or a percentage, and a project may lower it, never raise it', () => {
  const host = planted();
  const config = join(String(host.env['XDG_CONFIG_HOME']), 'claude-packs', 'governor.json');
  put(config, '{ "budget": 0.5, "ceiling": 12 }');
  assert.deepEqual(budgetOf(host), { cores: 18, slots: 9, ceiling: 12 });
  put(config, '{ "budget": "25%" }');
  assert.equal(budgetOf(host).slots, 4);
  put(config, '{ "budget": 8 }');
  const project = scratchDir('governor-project-');
  put(join(project, '.claude', 'layout.json'), '{ "guards": { "governor": { "budget": 3 } } }');
  assert.equal(budgetOf(host, project).slots, 3, 'a project lowers it');
  put(join(project, '.claude', 'layout.json'), '{ "guards": { "governor": { "budget": 16 } } }');
  assert.equal(budgetOf(host, project).slots, 8, 'and never raises it');
});

test('ask answers with the cores free now, the settings per kind and the load', () => {
  const host = planted(9.2);
  const a = ask(host, { kind: 'test', want: 3 });
  assert.equal(a.go, true);
  assert.equal(a.free, 3, 'the ceiling 13 less the load 9.2 leaves 3 whole cores, under the 10 free slots');
  assert.match(a.line, /^you may use 3 cores now \(tests: CLAUDE_PACKS_TEST_CORES=3; builds: -j3; fuzz: -parallel=2; agents: 1 more\); load 9\.2 of 18, ceiling 13, 0 jobs running$/);
});

test('ask says wait under a load over the ceiling, with the reason and when to ask again', () => {
  const a = ask(planted(14.1), { kind: 'test' });
  assert.equal(a.go, false);
  assert.match(a.line, /^wait: load 14\.1 over the ceiling 13; 0 cores free; ask again/);
});

test('two takes that together exceed the budget: the second is refused until the first is freed', () => {
  const host = planted(0);
  const first = granted(take(host, { kind: 'build', want: 6, pid: 101 }));
  const second = take(host, { kind: 'build', want: 6, pid: 102 });
  assert.equal(second.ok, false, 'six and six are over the ten slots');
  assert.match(second.ok ? '' : second.answer.line, /^wait: 6 wanted, 4 free/);
  assert.equal(free(host, first), true);
  granted(take(host, { kind: 'build', want: 6, pid: 102 }));
});

test('a grant whose pid is gone is freed on the next read: ask sees its slots free and the next write drops it', () => {
  const host = planted(0);
  granted(take(host, { kind: 'test', want: 10, pid: 201 }));
  assert.equal(ask(host, { want: 1 }).go, false, 'every slot is held');
  host.dead.add(201);
  const a = ask(host, { want: 1 });
  assert.equal(a.go, true);
  assert.equal(a.running, 0);
  granted(take(host, { kind: 'test', want: 10, pid: 202 }));
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

test('a take with no want gets what is free up to its kind\'s size, or its own upTo', () => {
  const host = planted(0);
  const r = take(host, { kind: 'build', pid: 401, upTo: 8 });
  assert.ok(r.ok);
  assert.equal(r.grant.slots, 8);
  const rest = take(host, { kind: 'build', pid: 402, upTo: 8 });
  assert.ok(rest.ok);
  assert.equal(rest.grant.slots, 2, 'the two left');
});

test('the queue is first in, first served: a waiter goes before a later take, and its ticket leaves the queue when granted', () => {
  const host = planted(0);
  const big = granted(take(host, { kind: 'build', want: 8, pid: 501 }));
  const ticket = queueUp(host, { kind: 'build', want: 4, pid: 502 });
  assert.equal(take(host, { kind: 'test', want: 1, pid: 503 }).ok, false, 'one would fit, but a job queued before it goes first');
  assert.equal(ask(host).queued, 1);
  free(host, big);
  granted(take(host, { kind: 'build', want: 4, pid: 502, ticket }));
  assert.equal(inFlight(host).waiting.length, 0);
  granted(take(host, { kind: 'test', want: 1, pid: 503 }));
});

test('a paused job is counted as paused until it runs again', () => {
  const host = planted(0);
  const id = granted(take(host, { kind: 'fuzz', want: 2, pid: 601 }));
  assert.equal(setPaused(host, id, 5), true);
  assert.equal(ask(host).paused, 1);
  assert.equal(setPaused(host, id, null), true);
  assert.equal(ask(host).paused, 0);
  assert.equal(setPaused(host, 'g-none', 5), false);
});

test('a lock left by a dead holder is broken, and the change goes through', () => {
  const host = planted(0);
  const dir = String(host.env['CLAUDE_PACKS_GOVERNOR_DIR']);
  put(join(dir, 'jobs.lock', 'pid'), '701\n');
  host.dead.add(701);
  assert.equal(changeState(dir, host.alive, () => 'changed'), 'changed');
});
