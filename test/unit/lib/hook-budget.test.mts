// lib/hook-budget.mts: doctor holds each hook per event (not pooled) and each event to the order's budget table (W8.4, d-9, review-2-go 6.3).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { DAEMON_START, logHook, type HookLogCall } from '../../../packs/base/hooks/lib/hook-log.mts';
import { COLD_EVENT_CALLS, COLD_HOOK_CALLS, EVENT_BUDGET, POOL_QUEUE_MS, budgetProblems, classOf, percentile } from '../../../lib/hook-budget.mts';

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
  assert.match(problems[0] ?? '', /^the resident runner's pool is full at Pre Bash: its events waited for a worker 80 ms at p95/);
  assert.doesNotMatch(problems.join('\n'), /busy-fake/);
  // the same lines with a queue under the limit blame the hook
  const calm = project();
  for (let i = 0; i < 10; i += 1) {
    logHook(calm, { ...BASH, hook: 'busy-fake', ms: 300, code: 0 });
    logHook(calm, { ...BASH, hook: 'event', ms: 330, code: 0, queue: POOL_QUEUE_MS, source: 'daemon' });
  }
  assert.match(said(calm).problems.join('\n'), /busy-fake at Pre Bash/);
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
