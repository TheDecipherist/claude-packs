// lib/hook-timing.mts: doctor's median and worst per hook, and what it judges.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { hookTimes, median, timingProblems } from '../../../lib/hook-timing.mjs';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const logOf = (rows: readonly [string, number][]): string => rows.map(([hook, ms]) => `2026-01-01T00:00:00Z\tPreToolUse\t${hook}\t${ms}\t0\tWrite`).join('\n');

test('median of an odd, an even and an empty list', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([1, 2, 3, 4]), 3);
  assert.equal(median([]), 0);
});

test('hookTimes keeps each hook\'s last calls only and puts the slowest median first', () => {
  const dir = scratchDir('timing-');
  put(join(dir, '.claude/hooks.log'), logOf([['fast', 1], ['slow', 900], ['slow', 900], ['slow', 1], ['slow', 1], ['fast', 3]]));
  assert.deepEqual(hookTimes(dir, 2), [
    { hook: 'fast', calls: 2, median: 2, worst: 3 },
    { hook: 'slow', calls: 2, median: 1, worst: 1 },
  ]);
});

test('buildq\'s build window lines are no hook', () => {
  const dir = scratchDir('timing-build-');
  put(join(dir, '.claude/hooks.log'), [logOf([['fast', 1]]), '2026-01-01T00:00:00Z\tBuild\tbuild-start\t0\t0\t42', '2026-01-01T00:00:01Z\tBuild\tbuild-end\t1022\t0\t42'].join('\n'));
  assert.deepEqual(hookTimes(dir, 5).map((t) => t.hook), ['fast']);
});

test('timingProblems judges a slow median over 3 calls, prints a slow one over fewer, and says so when no calls are logged', () => {
  const dir = scratchDir('timing-judge-');
  const said: string[] = [];
  assert.deepEqual(timingProblems(dir, (l) => said.push(l)), []);
  assert.match(said[0] ?? '', /no calls logged since the current install/);
  put(join(dir, '.claude/hooks.log'), logOf([['slowpoke', 800], ['slowpoke', 900], ['slowpoke', 7000], ['twice', 9000], ['twice', 9000]]));
  const problems = timingProblems(dir, (l) => said.push(l));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^slowpoke: median 900 ms over its last 3 calls \(worst 7000 ms\)/);
  assert.match(said.at(-1) ?? '', /twice 9000\/9000/);
});

test('timingProblems judges only the calls since the current install: a hook made fast is not red for its old calls (KWB-next)', () => {
  const dir = scratchDir('timing-install-');
  const at = (time: string, hook: string, ms: number): string => `${time}\tStop\t${hook}\t${ms}\t0\t-`;
  const old = [at('2026-01-01T00:00:00Z', 'judge', 1000), at('2026-01-01T00:00:01Z', 'judge', 1100), at('2026-01-01T00:00:02Z', 'judge', 1200)];
  put(join(dir, '.claude/hooks.log'), old.join('\n'));
  assert.equal(timingProblems(dir, () => undefined).length, 1, 'with no lock every call is judged');
  put(join(dir, '.claude/claude-packs.lock.json'), JSON.stringify({ updated: '2026-02-01T00:00:00Z' }));
  assert.deepEqual(timingProblems(dir, () => undefined), [], 'the calls before the install are another install\'s');
  const slowAgain = [at('2026-02-02T00:00:00Z', 'judge', 900), at('2026-02-02T00:00:01Z', 'judge', 950), at('2026-02-02T00:00:02Z', 'judge', 990)];
  put(join(dir, '.claude/hooks.log'), [...old, ...slowAgain].join('\n'));
  assert.match(timingProblems(dir, () => undefined)[0] ?? '', /^judge: median 950 ms over its last 3 calls/);
});

// supernova2_monitor, 2026-11-27: the machine went busy (a build beside a task) and stayed so; making-check's two Stop calls in
// that window ran 611 and 578 ms, and doctor's median check turned red and stopped the next task, though the event budgets left
// the same calls out (KWB-251). A busy window, or a build's, says nothing of a hook's own cost (KWB-254).
test('hookTimes leaves out the calls made inside a build\'s or a busy machine\'s window, as the event budgets do (KWB-254)', () => {
  const dir = scratchDir('timing-busy-');
  const at = (s: number, hook: string, ms: number, tool = 'Write'): string =>
    `2026-01-01T00:00:${String(s).padStart(2, '0')}Z\tStop\t${hook}\t${ms}\t0\t${tool}`;
  put(join(dir, '.claude/hooks.log'), [at(1, 'mc', 290), '2026-01-01T00:00:02Z\tLoad\tbusy-start\t0\t0\tmachine',
    at(3, 'mc', 611), at(4, 'mc', 578), '2026-01-01T00:00:05Z\tLoad\tbusy-end\t0\t0\tmachine', at(6, 'mc', 293)].join('\n'));
  assert.deepEqual(hookTimes(dir, 5), [{ hook: 'mc', calls: 2, median: 292, worst: 293 }]);
});
