// run-progress.mts, run-live.mts, run-transcripts.mts and run-remotes.mts: the pieces run-status is made of, each with its
// edge cases and one planted wrong input seen handled.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { alignLive, ago, checkedText, liveOf, type Aligned } from '../../../packs/base/hooks/lib/run-live.mts';
import { barCells, percent, progressOf, stepsOf } from '../../../packs/base/hooks/lib/run-progress.mts';
import { remoteRuns, remotesOf, remotesReport } from '../../../packs/base/hooks/lib/run-remotes.mts';
import { lastCall, sessionsDir, transcriptBeats } from '../../../packs/base/hooks/lib/run-transcripts.mts';

test('steps count their numbered lines plus the Done when; progress lines name items and done steps', () => {
  assert.deepEqual(stepsOf('## W0. Set up **[x]**\n\n1. a\n2. b\n\n## W1. Next\n'), [{ id: 'W0', title: 'Set up', items: 3 }, { id: 'W1', title: 'Next', items: 1 }]);
  const { seen, done } = progressOf(['W0.1 and W0.2 ok', 'W1 measured, done', 'nothing']);
  assert.deepEqual([...(seen.W0 ?? [])], [1, 2]);
  assert.deepEqual([...done], ['W1']);
});

test('percent and bar round the same way; an empty order is 0 and a wild percent is clamped', () => {
  assert.equal(percent(1, 3), 33.3);
  assert.equal(percent(0, 0), 0);
  assert.deepEqual(barCells(150, 10), [10, 0]);
  assert.deepEqual(barCells(Number.NaN, 10), [0, 10]);
});

test('ago and checkedText say a unit on every part; a wrong date says nothing', () => {
  assert.equal(ago(12), '12s');
  assert.equal(ago(65 * 60), '1h05m');
  assert.equal(checkedText('not a date', 0), '');
  assert.equal(checkedText(new Date(0).toISOString(), 8000), ', checked 8s ago');
});

test('an agent with no heartbeat and nothing running for half an hour is quiet; one with a running call and work is not', () => {
  const now = Date.parse('2026-01-01T01:00:00Z');
  const long = '2026-01-01T00:00:00Z';
  assert.equal(liveOf(null, long, { procs: 0, cores: 0, memMb: 0, queued: false }, now).quiet, 60);
  const beat = { t: '2026-01-01T00:30:00Z', event: 'pre', tool: 'Bash', what: 'make' };
  const busy = liveOf(beat, null, { procs: 3, cores: 1, memMb: 10, queued: false }, now);
  assert.equal(busy.quiet, 0);
  assert.equal(busy.action, '⟳ RUN make');
});

test('alignLive pads every column to its widest value', () => {
  const row = (beat: string, procs: number): Aligned => ({ beat, work: { procs, cores: 1, memMb: 5, queued: false }, action: '', quiet: 0, live: '' });
  const [a, b] = alignLive([row('♥ 1s', 2), row('♥ 12s', 10)]);
  assert.equal(a?.live, '♥ 1s  ⚙  2 proc · 1.0 cpu · 5M ram');
  assert.equal(b?.live, '♥ 12s ⚙ 10 proc · 1.0 cpu · 5M ram');
});

test('a transcript gives its last call, pre until a result names it, and the worktrees its calls name', () => {
  const dir = scratchDir('run-transcripts-');
  const use = (id: string, input: object): string => toJson({ message: { content: [{ type: 'tool_use', id, name: 'Bash', input }] } });
  const file = join(dir, 's.jsonl');
  writeFileSync(file, `${use('1', { command: 'ls /p/.claude/worktrees/w1-a' })}\nnot json\n`);
  assert.deepEqual(lastCall(file)?.trees, ['w1-a']);
  assert.equal(lastCall(file)?.event, 'pre');
  writeFileSync(file, `${use('1', { command: 'ls' })}\n${toJson({ message: { content: [{ type: 'tool_result', tool_use_id: '1' }] } })}\n`);
  assert.equal(lastCall(file)?.event, 'post');
  assert.equal(lastCall(join(dir, 'missing.jsonl')), null);
});

test('transcriptBeats puts the lead and each agent by worktree under the sessions folder', () => {
  const home = scratchDir('run-beats-');
  const dir = sessionsDir('/p/x', home);
  mkdirSync(join(dir, 'sess', 'subagents'), { recursive: true });
  const use = (command: string): string => toJson({ message: { content: [{ type: 'tool_use', id: 'a', name: 'Read', input: { command } }] } });
  writeFileSync(join(dir, 'lead.jsonl'), `${use('x')}\n`);
  writeFileSync(join(dir, 'sess', 'subagents', 'agent-1.jsonl'), `${use('/p/x/.claude/worktrees/w9-z/f')}\n`);
  assert.deepEqual(Object.keys(transcriptBeats('/p/x', { home })).sort(), ['lead', 'w9-z']);
  assert.deepEqual(transcriptBeats('/p/none', { home }), {});
});

test('remotes: a folder that is not a plain path is left out; an ask that throws or answers wrongly is unreachable', () => {
  const dir = scratchDir('run-remotes-unit-');
  const file = join(dir, 'remotes.json');
  writeFileSync(file, toJson({ remotes: [{ name: 'a', ssh: 'a' }, { name: 'b', ssh: 'b', dir: '~/x; rm -rf ~' }] }));
  assert.deepEqual(remotesOf(file).map((r) => r.name), ['a']);
  const [a] = remotesOf(file);
  assert.ok(a);
  assert.equal(remoteRuns(a, () => { throw new Error('refused\nConnection refused'); }).unreachable?.why, 'Connection refused');
  assert.match(remoteRuns(a, () => 'Usage: x').unreachable?.why ?? '', /no status from its kit/);
  const ok = remotesReport([a], () => toJson({ runs: [{ order: 'o' }] }));
  assert.deepEqual(ok.runs, [{ order: 'o', host: 'a' }]);
});
