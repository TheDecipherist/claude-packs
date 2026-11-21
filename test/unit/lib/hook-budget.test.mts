// lib/hook-budget.mts: doctor holds each hook per event (not pooled) and each event to the order's budget table (W8.4, d-9, review-2-go 6.3).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { BUILD_END, BUILD_START, BUSY_END, BUSY_START, DAEMON_START, logHook, type HookLogCall } from '../../../packs/base/hooks/lib/hook-log.mts';
import { BUILD_WINDOW_MS, COLD_EVENT_CALLS, COLD_HOOK_CALLS, EVENT_BUDGET, POOL_QUEUE_MS, budgetProblems, classOf, percentile } from '../../../lib/hook-budget.mts';

const project = (): string => { const dir = scratchDir('hook-budget-'); ensureDir(join(dir, '.claude')); return dir; };
const lines = (dir: string, n: number, call: HookLogCall): void => { for (let i = 0; i < n; i += 1) logHook(dir, call); };
const BASH = { event: 'PreToolUse', tool: 'Bash' };
const said = (dir: string): { out: string[]; problems: string[] } => { const out: string[] = []; return { problems: budgetProblems(dir, (l) => out.push(l)), out }; };

test('a hook that sleeps 300 ms at one event is named at that event; the same hook quick at another event is not', () => {
  const dir = project();
  lines(dir, 8, { ...BASH, hook: 'slow-fake', ms: 300, code: 0 });
  lines(dir, 8, { event: 'PostToolUse', tool: 'Bash', hook: 'slow-fake', ms: 2, code: 0 });
  lines(dir, 8, { ...BASH, hook: 'quick-fake', ms: 3, code: 0 });
  const { problems } = said(dir);
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0] ?? '', /^slow-fake at Pre Bash: 300\/300 ms \(p50\/p95, worst 300\) over its last 8 calls, over its budget of 10\/50 ms and worst 200/);
});

test('only the calls since the current install are judged: slow calls before an update count against nothing (KWB-196)', () => {
  const dir = project();
  const pause = (): void => { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); };
  lines(dir, 8, { ...BASH, hook: 'once-slow', ms: 300, code: 0 });
  pause();
  writeFileSync(join(dir, '.claude/claude-packs.lock.json'), toJson({ kit: 'x', packs: ['base'], files: {}, updated: new Date().toISOString() }));
  pause();
  lines(dir, 8, { ...BASH, hook: 'once-slow', ms: 3, code: 0 });
  assert.deepEqual(said(dir).problems, []);
});

test('hooks are held per event, never pooled: 50 quick calls at one event do not hide a slow median at another', () => {
  const dir = project();
  lines(dir, 50, { event: 'UserPromptSubmit', tool: '-', hook: 'reuse-hint', ms: 1, code: 0 });
  lines(dir, 6, { event: 'Stop', tool: '-', hook: 'reuse-hint', ms: 90, code: 0 });
  const { problems } = said(dir);
  assert.deepEqual(problems.map((p) => p.split(':')[0]), ['reuse-hint at Stop']);
});

test('a hook with its own row (reuse-hint, once per prompt) is held to it at 80/200 ms: 70 ms passes, 300 ms is named with the row\'s numbers; an unnamed hook at 70 ms is named (d-38)', () => {
  const dir = project();
  const prompt = { event: 'UserPromptSubmit', tool: '-' };
  lines(dir, 8, { ...prompt, hook: 'reuse-hint', ms: 70, code: 0 });
  lines(dir, 8, { ...prompt, hook: 'another-fake', ms: 70, code: 0 });
  assert.deepEqual(said(dir).problems.map((p) => p.split(':')[0]), ['another-fake at Prompt']);
  lines(dir, 8, { ...prompt, hook: 'reuse-hint', ms: 300, code: 0 });
  assert.match(said(dir).problems.join('\n'), /reuse-hint at Prompt: .* over its budget of 80\/200 ms/);
});

test('fewer than five calls are printed, not judged; Stop alone may take its git look (worst 1,500)', () => {
  const dir = project();
  lines(dir, 4, { ...BASH, hook: 'once', ms: 900, code: 0 });
  lines(dir, 20, { event: 'Stop', tool: '-', hook: 'git-guard', ms: 6, code: 0 });
  logHook(dir, { event: 'Stop', tool: '-', hook: 'git-guard', ms: 1233, code: 0 });
  assert.deepEqual(said(dir).problems, []);
});

test('the event is held to its wall on the proxy line when there is one, else on the event line', () => {
  const dir = project();
  lines(dir, 10, { ...BASH, hook: 'event', ms: 400, code: 0, queue: 0, source: 'runner' });
  assert.match(said(dir).problems.join('\n'), /Pre Bash: the event took 400\/400 ms \(p50\/p95 of 10 calls, the event line's wall\), over its budget of 100\/250 ms/);
  lines(dir, 10, { ...BASH, hook: 'proxy', ms: 9, code: 0, queue: 0, source: 'proxy' });
  assert.deepEqual(said(dir).problems, [], 'with a proxy line, its wall is the event\'s');
  assert.match(said(dir).out.join('\n'), /Pre Bash 9\/9 of 100\/250/);
});

test('a full pool is named, and no hook is blamed for the time it waited', () => {
  const dir = project();
  for (let i = 0; i < 10; i += 1) {
    logHook(dir, { ...BASH, hook: 'busy-fake', ms: 300, code: 0 });
    logHook(dir, { ...BASH, hook: 'event', ms: 330, code: 0, queue: 80, source: 'daemon' });
  }
  const { problems } = said(dir);
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0] ?? '', /^the resident runner's pool is full at Pre Bash: its events waited for a worker 80 ms at p50 over their last 10/);
  assert.doesNotMatch(problems.join('\n'), /busy-fake/);
  // the same lines with a queue under the limit blame the hook
  const calm = project();
  for (let i = 0; i < 10; i += 1) {
    logHook(calm, { ...BASH, hook: 'busy-fake', ms: 300, code: 0 });
    logHook(calm, { ...BASH, hook: 'event', ms: 330, code: 0, queue: POOL_QUEUE_MS, source: 'daemon' });
  }
  assert.match(said(calm).problems.join('\n'), /busy-fake at Pre Bash/);
});

// supernova2_monitor, 2026-11-14: `update` restarted the daemon, and doctor --strict called the pool full on 8 events
test('a pool is judged on warm events, and on its median until it has 20: one slow event is no full pool', () => {
  const series = [42, 26, 8, 5, 7, 35, 6, 9, 2, 4, 3, 2, 8];   // the queue waits after the start, in order: two cold, one slow commit
  const dir = project();
  logHook(dir, START);
  for (const queue of series) logHook(dir, { ...BASH, hook: 'event', ms: queue + 4, code: 0, queue, source: 'daemon' });
  assert.deepEqual(said(dir).problems, []);
  const busy = project();   // a pool every event waits on is still full, at p95 once there are 20
  for (let i = 0; i < 24; i += 1) logHook(busy, { ...BASH, hook: 'event', ms: 90, code: 0, queue: i % 10 === 0 ? 4 : 80, source: 'daemon' });
  assert.match(said(busy).problems.join('\n'), /pool is full at Pre Bash: its events waited for a worker 80 ms at p95 over their last 24/);
});

test('every worker\'s first event after a start is cold, not only the first event', () => {
  const dir = project();
  logHook(dir, START);
  // one cold wait per worker that starts cold (SPREAD of them, the count COLD_HOOK_CALLS names), whatever COLD_EVENT_CALLS says
  lines(dir, COLD_HOOK_CALLS, { ...BASH, hook: 'event', ms: 84, code: 0, queue: 80, source: 'daemon' });
  lines(dir, 20, { ...BASH, hook: 'event', ms: 7, code: 0, queue: 3, source: 'daemon' });
  assert.deepEqual(said(dir).problems, [], 'the cold waits are not judged, and 20 warm ones are within the limit');
});

// supernova2_monitor WB-11: hooks slowed by the project's own build (buildq held most of the cores) failed doctor --strict
test('a hook is not judged by the time a build took from it, and is judged again once the build ends', () => {
  const dir = project();
  logHook(dir, { event: 'Build', hook: BUILD_START, ms: 0, code: 0, tool: '4242' });
  lines(dir, 10, { ...BASH, hook: 'slow-fake', ms: 300, code: 0 });
  logHook(dir, { event: 'Build', hook: BUILD_END, ms: 90_000, code: 0, tool: '4242' });
  const during = said(dir);
  assert.deepEqual(during.problems, []);
  assert.match(during.out.join('\n'), /10 hook line\(s\) made while a build ran are not judged/);
  lines(dir, 10, { ...BASH, hook: 'slow-fake', ms: 300, code: 0 });
  assert.match(said(dir).problems.join('\n'), /^slow-fake at Pre Bash/, 'the same calls with no build beside them are judged');
});

test('a build that never logged its end shields no call after an hour', () => {
  const dir = project();
  const at = (msAgo: number): string => new Date(Date.now() - msAgo).toISOString();
  const row = (time: string, event: string, hook: string, ms: number, tool: string): string => `${time}\t${event}\t${hook}\t${ms}\t0\t${tool}\n`;
  const old = row(at(2 * BUILD_WINDOW_MS), 'Build', BUILD_START, 0, '99');
  const slow = Array.from({ length: 10 }, () => row(at(1000), 'PreToolUse', 'slow-fake', 300, 'Bash')).join('');
  writeFileSync(join(dir, '.claude', 'hooks.log'), old + slow);
  assert.match(said(dir).problems.join('\n'), /^slow-fake at Pre Bash/);
});

// supernova2_monitor WB-12: one commit's slow call failed a hook's budget for every later session
test('a hook with fewer than 20 calls is judged on its median: one slow call among them is no slow hook', () => {
  const dir = project();
  lines(dir, 9, { ...BASH, hook: 'once-fake', ms: 0, code: 0 });
  lines(dir, 1, { ...BASH, hook: 'once-fake', ms: 150, code: 0 });
  assert.deepEqual(said(dir).problems, []);
});

test('git-guard has its git child\'s budget at p95; a hook with no row is held to the base budget on the same calls', () => {
  const dir = project();
  const commits = (hook: string): void => { for (let i = 0; i < 30; i += 1) logHook(dir, { ...BASH, hook, ms: i % 5 === 0 ? 110 : 0, code: 0 }); };
  commits('git-guard');
  assert.deepEqual(said(dir).problems, [], 'every fifth call a commit at 110 ms, the rest 0');
  commits('plain-fake');
  assert.match(said(dir).problems.join('\n'), /^plain-fake at Pre Bash: 0\/110 ms/);
});

test('the table: the classes, the percentile, the tools no budget names', () => {
  assert.deepEqual(Object.keys(EVENT_BUDGET), ['Pre Bash', 'Pre Write', 'Post', 'Prompt', 'SessionStart', 'Stop']);
  assert.deepEqual([EVENT_BUDGET.Stop.p50, EVENT_BUDGET.Stop.p95, EVENT_BUDGET['Pre Write'].p95], [200, 1000, 300]);
  assert.equal(classOf('PreToolUse', 'Edit'), 'Pre Write');
  assert.equal(classOf('PreToolUse', 'Read'), null);
  assert.equal(classOf('SessionEnd', '-'), null);
  assert.equal(percentile([1, 2, 3, 4, 100], 95), 100);
  assert.equal(percentile([], 95), 0);
});

const START: HookLogCall = { event: 'DaemonStart', hook: DAEMON_START, ms: 0, code: 0, source: 'daemon' };

test('the cold calls after a daemon start are not judged; warm slow calls still are', () => {
  const dir = project();
  logHook(dir, START);
  lines(dir, COLD_HOOK_CALLS, { ...BASH, hook: 'cold-fake', ms: 900, code: 0 });   // one call per worker that first runs the hook
  lines(dir, 8, { ...BASH, hook: 'cold-fake', ms: 3, code: 0 });
  lines(dir, COLD_EVENT_CALLS, { ...BASH, hook: 'proxy', ms: 1100, code: 0, queue: 0, source: 'proxy' });
  lines(dir, 8, { ...BASH, hook: 'proxy', ms: 20, code: 0, queue: 0, source: 'proxy' });
  assert.deepEqual(said(dir).problems, []);
  lines(dir, COLD_HOOK_CALLS + 8, { ...BASH, hook: 'slow-fake', ms: 300, code: 0 });   // not cold: the first calls are dropped, the rest are judged
  assert.match(said(dir).problems.join('\n'), /^slow-fake at Pre Bash/);
});

test('a start judges nothing below five warm calls, and a second start is cold again', () => {
  const dir = project();
  logHook(dir, START);
  lines(dir, COLD_HOOK_CALLS + 4, { ...BASH, hook: 'few', ms: 900, code: 0 });   // four warm calls: printed, not judged
  assert.deepEqual(said(dir).problems, []);
  const again = project();
  logHook(again, START);
  lines(again, COLD_HOOK_CALLS, { ...BASH, hook: 'few', ms: 900, code: 0 });
  lines(again, 8, { ...BASH, hook: 'few', ms: 3, code: 0 });
  logHook(again, START);
  lines(again, COLD_HOOK_CALLS, { ...BASH, hook: 'few', ms: 900, code: 0 });   // the second start's cold calls
  lines(again, 8, { ...BASH, hook: 'few', ms: 3, code: 0 });
  assert.deepEqual(said(again).problems, []);
});

test('without a daemon-start line no call is cold: the process-per-hook runner pays its own load every call', () => {
  const dir = project();
  lines(dir, 8, { ...BASH, hook: 'plain', ms: 900, code: 0 });
  assert.equal(said(dir).problems.length, 1);
});

// supernova2_monitor, after its turn 31: the pool's waits came while another project's gates held the machine past the ceiling
test('an event the pool made wait while the machine was past the governor\'s ceiling is not charged to the pool; after it is (KWB-next)', () => {
  const dir = project();
  logHook(dir, { event: 'Load', hook: BUSY_START, ms: 0, code: 0, tool: 'machine' });
  lines(dir, 30, { ...BASH, hook: 'event', ms: 160, code: 0, queue: 150, source: 'daemon' });
  logHook(dir, { event: 'Load', hook: BUSY_END, ms: 0, code: 0, tool: 'machine' });
  assert.deepEqual(said(dir).problems, [], 'waits on a full machine are not the pool');
  lines(dir, 30, { ...BASH, hook: 'event', ms: 160, code: 0, queue: 150, source: 'daemon' });
  assert.match(said(dir).problems.join('\n'), /pool is full at Pre Bash/, 'the same waits on a machine with room are');
});

// supernova2_monitor after W2.8: one push's ls-remote (539 ms) turned doctor red on git-guard's worst
test('git-guard\'s worst allows one network round trip (a push asks GitHub for its heads); a hook with no row is held to 200 ms (KWB-next)', () => {
  const dir = project();
  const calls = (hook: string): void => { for (let i = 0; i < 6; i += 1) logHook(dir, { ...BASH, hook, ms: i === 2 ? 539 : 3, code: 0 }); };
  calls('git-guard');
  assert.deepEqual(said(dir).problems, [], 'a push at 539 ms among quick calls');
  calls('plain-fake');
  assert.match(said(dir).problems.join('\n'), /^plain-fake at Pre Bash: .*worst 539/);
});

test('below 20 calls an event\'s p95 is its slowest call, and the median stands for it, as for a hook (KWB-next)', () => {
  const dir = project();
  for (let i = 0; i < 14; i += 1) logHook(dir, { ...BASH, hook: 'proxy', ms: i === 5 ? 543 : 15, code: 0, queue: 0, source: 'proxy' });
  assert.deepEqual(said(dir).problems.filter((p) => /^Pre Bash: the event/.test(p)), [], 'one push among 14 calls');
  for (let i = 0; i < 20; i += 1) logHook(dir, { ...BASH, hook: 'proxy', ms: 543, code: 0, queue: 0, source: 'proxy' });
  assert.match(said(dir).problems.join('\n'), /^Pre Bash: the event took/m, 'slow calls in number still are');
});

test('firmware-out-of-git\'s worst allows a commit of many files (its git child reads every staged path) (KWB-next)', () => {
  const dir = project();
  for (let i = 0; i < 6; i += 1) logHook(dir, { ...BASH, hook: 'firmware-out-of-git', ms: i === 3 ? 255 : 0, code: 0 });
  assert.deepEqual(said(dir).problems, [], 'one commit of many files at 255 ms');
});

test('an event made slow only by a hook\'s declared wait (git-guard\'s push) is judged by that hook\'s allowance, not again as the event\'s wall (KWB-next)', () => {
  // as supernova2_monitor's W2.9 logged it: over 35 calls one push (git-guard 402 ms) and one other slow event made the p95
  const dir = project();
  for (let i = 0; i < 35; i += 1) {
    const push = i === 30;
    logHook(dir, { ...BASH, hook: 'git-guard', ms: push ? 402 : 1, code: 0 });
    logHook(dir, { ...BASH, hook: 'other-fake', ms: i === 10 ? 40 : 1, code: 0 });
    logHook(dir, { ...BASH, hook: 'event', ms: push ? 404 : i === 10 ? 300 : 8, code: 0, queue: 0, source: 'daemon' });
    logHook(dir, { ...BASH, hook: 'proxy', ms: push ? 405 : i === 10 ? 310 : 11, code: 0, queue: 0, source: 'proxy' });
  }
  assert.deepEqual(said(dir).problems, [], 'the push is git-guard\'s to answer for; one other slow event is not a p95');
  const other = project();
  for (let i = 0; i < 35; i += 1) {
    logHook(other, { ...BASH, hook: 'slow-fake', ms: i === 30 ? 400 : 1, code: 0 });
    logHook(other, { ...BASH, hook: 'proxy', ms: i === 30 ? 405 : i === 10 ? 310 : 11, code: 0, queue: 0, source: 'proxy' });
  }
  assert.match(said(other).problems.join('\n'), /^Pre Bash: the event took/m, 'a hook with no declared wait still makes the event slow');
});

// KWB-next (2026-11-22): a hook at Stop runs once per turn and reads the turn (making-check took 100 to 300 ms at every Stop since
// supernova2_monitor's first stage); it was held to a tool call's 10/50 and failed doctor whenever a window held five Stops
test('a hook at Stop is held to the Stop event\'s budget, not a tool call\'s; the same time at a tool call still fails', () => {
  const dir = project();
  lines(dir, 8, { event: 'Stop', tool: '-', hook: 'turn-reader', ms: 120, code: 0 });
  assert.deepEqual(said(dir).problems.filter((p) => p.startsWith('turn-reader')), [], '120 ms at Stop is inside Stop\'s budget');
  const slow = project();
  lines(slow, 8, { event: 'Stop', tool: '-', hook: 'turn-reader', ms: EVENT_BUDGET.Stop.p50 + 100, code: 0 });
  assert.ok(said(slow).problems.some((p) => p.startsWith('turn-reader at Stop')), 'past Stop\'s own median it is still named');
  const tool = project();
  lines(tool, 8, { ...BASH, hook: 'turn-reader', ms: 120, code: 0 });
  assert.ok(said(tool).problems.some((p) => p.startsWith('turn-reader at Pre Bash')), 'at a tool call 120 ms is still over 10/50');
});

// KWB-next (2026-11-22): on a machine others loaded, an event now and then ran on a starved worker: settings-layer, 0 ms on every other
// call, took 141 ms, and once-only 150 beside it; over 29 calls that pair was each hook's p95 (supernova2_monitor stage 6)
test('an event a starved worker ran (a canary hook, about 0 ms on every other call, took 50 ms or more) leaves every hook\'s times; a hook slow on its own is still named', () => {
  const event = (dir: string, canary: number, judged: number): void => {
    logHook(dir, { ...BASH, hook: 'canary-fake', ms: canary, code: 0 });
    logHook(dir, { ...BASH, hook: 'judged-fake', ms: judged, code: 0 });
    logHook(dir, { ...BASH, hook: 'event', ms: canary + judged + 2, code: 0, queue: 1, source: 'daemon' });
  };
  const dir = project();
  for (let i = 0; i < 27; i += 1) event(dir, 0, 6);
  event(dir, 141, 150);
  event(dir, 120, 140);
  assert.deepEqual(said(dir).problems.filter((p) => p.includes('-fake')), [], 'the two starved events are left out');
  const alone = project();
  for (let i = 0; i < 25; i += 1) event(alone, 0, 6);
  for (let i = 0; i < 4; i += 1) event(alone, 0, 150);
  assert.ok(said(alone).problems.some((p) => p.startsWith('judged-fake')), 'slow beside a fast canary: the hook itself, still named');
});

test('shape-law and template-law, which read a whole new file at Pre Write, have their own row at 20 ms p50; a hook with none is held to 10', () => {
  const dir = project();
  for (const hook of ['shape-law', 'template-law', 'plain-fake']) lines(dir, 20, { event: 'PreToolUse', tool: 'Write', hook, ms: 14, code: 0 });
  const named = said(dir).problems.map((p) => p.split(' ')[0]);
  assert.deepEqual(named, ['plain-fake'], `named: ${named.join(', ')}`);
});
