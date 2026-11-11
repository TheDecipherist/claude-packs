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

test('timingProblems judges a slow median over 3 calls, prints a slow one over fewer, and says so when no calls are logged', () => {
  const dir = scratchDir('timing-judge-');
  const said: string[] = [];
  assert.deepEqual(timingProblems(dir, (l) => said.push(l)), []);
  assert.match(said[0] ?? '', /no calls logged yet/);
  put(join(dir, '.claude/hooks.log'), logOf([['slowpoke', 800], ['slowpoke', 900], ['slowpoke', 7000], ['twice', 9000], ['twice', 9000]]));
  const problems = timingProblems(dir, (l) => said.push(l));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^slowpoke: median 900 ms over its last 3 calls \(worst 7000 ms\)/);
  assert.match(said.at(-1) ?? '', /twice 9000\/9000/);
});
