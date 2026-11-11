// lib/logs.mts: refusals joined to verdicts, crashes and their clears, the summary.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { clearedAt, clearsOf, logsCommand, logsSummary } from '../../../lib/logs.mjs';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const jsonl = (rows: readonly object[]): string => `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`;

const project = (): string => {
  const dir = scratchDir('logs-');
  put(join(dir, '.claude/logs/refusals.jsonl'), jsonl([
    { id: 'r1', t: '2026-01-01T00:00:01Z', hook: 'h', code: 2, file: 'a.ts', reason: 'no\nmore', session: 's' },
    { id: 'r2', t: '2026-01-01T00:00:02Z', hook: 'h', code: 2, file: 'b.ts', reason: 'again', session: 's' },
  ]));
  put(join(dir, '.claude/logs/crashes.jsonl'), `${jsonl([{ id: 'c1', t: '2026-01-01T00:00:03Z', hook: 'boom', reason: 'TypeError' }])}not json\n`);
  put(join(dir, '.claude/logs/events.jsonl'), jsonl([
    { t: '2026-01-01T00:00:05Z', session: 's', file: 'a.ts', hooks: [{ hook: 'h', ms: 4, code: 0 }] },
    { t: '2026-01-01T00:00:06Z', session: 's', file: 'z.ts', hooks: [{ hook: 'h', ms: 8, code: 0 }] },
  ]));
  return dir;
};

test('mark joins a verdict to a refusal; a crash or an unknown id is refused with its reason', () => {
  const dir = project();
  const said: string[] = [];
  const log = (l: string): number => said.push(l);
  assert.equal(logsCommand(dir, ['mark', 'r1', 'wrong', 'it', 'was', 'fine'], log), 0);
  assert.match(readText(join(dir, '.claude/logs/verdicts.jsonl')) ?? '', /"id":"r1","verdict":"wrong","why":"it was fine"/);
  assert.throws(() => logsCommand(dir, ['mark', 'c1', 'right', 'x'], log), /is a crash/);
  assert.throws(() => logsCommand(dir, ['mark', 'nope', 'right', 'x'], log), /no refusal nope/);
  assert.throws(() => logsCommand(dir, ['mark', 'r2', 'maybe', 'x'], log), /use `logs mark/);
  logsCommand(dir, ['refusals', '--open'], log);
  assert.ok(said.some((l) => l.startsWith('r2 ') && l.endsWith('again')), 'r2 is still open');
  assert.ok(!said.some((l) => l.startsWith('r1 ')), 'r1 is judged, so --open leaves it out');
  assert.equal(said.at(-1), '1 refusal(s)');
});

test('a clear hides the crashes before it; a later crash is open again; clear needs a crash and a reason', () => {
  const dir = project();
  const said: string[] = [];
  const log = (l: string): number => said.push(l);
  assert.throws(() => logsCommand(dir, ['clear', 'boom', 'fixed'], log), /use `logs clear/);
  assert.throws(() => logsCommand(dir, ['clear', 'quiet', 'fixed', 'x'], log), /no crash of quiet/);
  logsCommand(dir, ['clear', 'boom', 'fixed', 'patched'], log);
  const clears = clearsOf(dir);
  assert.ok(clearedAt(clears, 'boom') > '2026-01-01T00:00:03Z', 'the clear is stamped after the crash');
  assert.equal(clearedAt(clears, 'other'), '');
  logsCommand(dir, ['crashes'], log);
  assert.ok(said.some((l) => /^c1 \S+ boom cleared\n {2}-\n {2}TypeError$/.test(l)), said.join('|'));
});

test('the summary counts calls, refusals by verdict, crashes and a pass after a refusal', () => {
  const dir = project();
  logsCommand(dir, ['mark', 'r1', 'right', 'ok'], () => 0);
  const s = logsSummary(dir);
  assert.equal(s.calls, 2);
  const h = s.rows.find((r) => r.hook === 'h');
  assert.deepEqual([h?.calls, h?.refused, h?.right, h?.wrong, h?.open, h?.passedAfter], [2, 2, 1, 0, 1, 1]);
  assert.equal(s.rows.find((r) => r.hook === 'boom')?.crashed, 1);
});

test('an empty project says nothing is logged', () => {
  const said: string[] = [];
  assert.equal(logsCommand(scratchDir('logs-empty-'), [], (l) => said.push(l)), 0);
  assert.match(said[0] ?? '', /no calls logged yet/);
});
