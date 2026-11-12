// scripts/ab-compare.mts and scripts/ab-transcript.mts (W11.0): a transcript read into turns, tokens, wall, hook waiting and refusals,
// and one task's row written from an original's record, a new run's transcript and a clone. Planted pairs of tiny transcripts.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { compareRow, type RunRecord } from '../../../scripts/ab-compare.mts';
import { summariseTranscript } from '../../../scripts/ab-transcript.mts';

const usage = (input: number, output: number, read: number, write: number) =>
  ({ input_tokens: input, output_tokens: output, cache_read_input_tokens: read, cache_creation_input_tokens: write });
const turn = (id: string, at: string, u: ReturnType<typeof usage>, blocks: unknown[] = []) =>
  toJson({ type: 'assistant', timestamp: at, message: { id, model: 'claude-opus-5-5', usage: u, content: blocks } });
const call = (id: string, name: string) => ({ type: 'tool_use', id, name, input: {} });
const result = (id: string, at: string, text: string, isError: boolean) =>
  toJson({ type: 'user', timestamp: at, message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: text }] } });
const hook = (at: string, ms: number) => toJson({ type: 'attachment', timestamp: at, attachment: { type: 'hook_success', durationMs: String(ms) } });

/** Two turns of one message split in two blocks (usage repeated), a hook of 250 ms, a refused Bash then the same Bash again. */
const planted = (): string => [
  toJson({ type: 'user', timestamp: '2026-11-11T06:00:00.000Z', message: { role: 'user', content: 'do it' } }),
  turn('m1', '2026-11-11T06:00:05.000Z', usage(2, 100, 0, 5000), [call('t1', 'Bash')]),
  turn('m1', '2026-11-11T06:00:05.100Z', usage(2, 100, 0, 5000)),
  hook('2026-11-11T06:00:06.000Z', 250),
  result('t1', '2026-11-11T06:00:07.000Z', 'PreToolUse:Bash hook error: [shell-traps]: no', true),
  turn('m2', '2026-11-11T06:01:00.000Z', usage(3, 40, 5000, 10), [call('t2', 'Bash')]),
  hook('2026-11-11T06:01:01.000Z', 750),
  result('t2', '2026-11-11T06:01:02.000Z', 'ok', false),
].join('\n');

test('a transcript is read into turns, tokens by usage, wall, hook waiting, refusals and retries', () => {
  const s = summariseTranscript(planted());
  assert.equal(s.turns, 2, 'a message written in two blocks is one turn');
  assert.deepEqual(s.tokens, { input: 5, output: 140, cacheRead: 5000, cacheWrite: 5010 });
  assert.equal(s.wallMs, 62000);
  assert.equal(s.hookMs, 1000);
  assert.equal(s.refusals, 1);
  assert.equal(s.retries, 1, 'the next Bash after a refused Bash is a retry');
  assert.equal(s.model, 'claude-opus-5-5');
});

test('a transcript with a bad line or no lines is read, not thrown on', () => {
  assert.equal(summariseTranscript('not json\n').turns, 0);
  assert.equal(summariseTranscript('').wallMs, 0);
});

const git = (cwd: string, ...args: string[]): string => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });

/** A clone with a base commit, an original's tip (a.txt and b.txt changed) and a new run (a.txt the same, c.txt new, b.txt left). */
function plantedClone(): { dir: string; base: string; original: string } {
  const dir = scratchDir('ab-compare-');
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'config', 'user.email', 'a@b.c'); git(dir, 'config', 'user.name', 'x');
  put(join(dir, 'a.txt'), 'one\n'); put(join(dir, 'b.txt'), 'one\n');
  git(dir, 'add', 'a.txt', 'b.txt'); git(dir, 'commit', '-q', '-m', 'base');
  const base = git(dir, 'rev-parse', 'HEAD').trim();
  git(dir, 'checkout', '-q', '-b', 'original');
  put(join(dir, 'a.txt'), 'two\n'); put(join(dir, 'b.txt'), 'two\n');
  git(dir, 'commit', '-q', '-am', 'original');
  const original = git(dir, 'rev-parse', 'HEAD').trim();
  git(dir, 'checkout', '-q', '-b', 'new', base);
  put(join(dir, 'a.txt'), 'two\n'); put(join(dir, 'c.txt'), 'three\n');
  git(dir, 'add', 'a.txt', 'c.txt'); git(dir, 'commit', '-q', '-m', 'new');
  return { dir, base, original };
}

test('a task row names its gates, files, diff against the original, turns, tokens, wall, hook waiting and refusals', () => {
  const { dir, base, original } = plantedClone();
  const before: RunRecord = {
    task: 'planted', model: 'claude-opus-5-5', turns: 4, tokens: { input: 10, output: 200, cacheRead: 9000, cacheWrite: 800 },
    wallMs: 120000, hookMs: 2000, refusals: 2, retries: 1, base, originalTip: original,
    gates: [{ name: 'g_one', pass: true }, { name: 'g_two', pass: true }],
  };
  const out = scratchDir('ab-out-');
  put(join(out, 'new-gates.json'), toJson({ g_one: 'pass', g_two: 'fail' }));
  const row = compareRow({ original: before, transcript: planted(), clone: dir, gatesFile: join(out, 'new-gates.json') });
  assert.match(row, /### planted/);
  assert.match(row, /\| g_one \| pass \| pass \|/);
  assert.match(row, /\| g_two \| pass \| fail \|/);
  assert.match(row, /files changed \| 2 \| 2 \|/, 'the original changed a and b, the new run a and c');
  assert.match(row, /same as the original's: a\.txt/, 'a.txt is identical in both');
  assert.match(row, /only in the original: b\.txt/);
  assert.match(row, /only in the new run: c\.txt/);
  assert.match(row, /turns \| 4 \| 2 \|/);
  assert.match(row, /wall \(s\) \| 120 \| 62 \|/);
  assert.match(row, /hook waiting \(s\) \| 2 \| 1 \|/);
  assert.match(row, /refusals \| 2 \| 1 \|/);
});

test('a number held only on the other computer reads "not on this machine"', () => {
  const { dir, base } = plantedClone();
  const before: RunRecord = { task: 'pc', model: null, turns: null, tokens: null, wallMs: null, hookMs: null, refusals: null, retries: null, base, originalTip: base, gates: [] };
  const row = compareRow({ original: before, transcript: planted(), clone: dir, gatesFile: null });
  assert.match(row, /turns \| not on this machine \| 2 \|/);
  assert.equal(readText(join(dir, 'a.txt')), 'two\n');
});

test('the original tip is fetched from its source when the clone never held it, and the run starts from its kit commit', () => {
  const { dir: source, base, original } = plantedClone();
  const clone = scratchDir('ab-fresh-');
  git(clone, 'init', '-q', '-b', 'new');
  git(clone, 'config', 'user.email', 'a@b.c'); git(clone, 'config', 'user.name', 'x');
  git(clone, 'fetch', '-q', '--no-tags', source, base);
  git(clone, 'checkout', '-q', 'FETCH_HEAD', '-B', 'new');
  put(join(clone, 'kit.txt'), 'installed\n');
  git(clone, 'add', 'kit.txt'); git(clone, 'commit', '-q', '-m', 'kit');
  const cloneBase = git(clone, 'rev-parse', 'HEAD').trim();
  put(join(clone, 'a.txt'), 'two\n');
  assert.notEqual(git(clone, 'cat-file', '-t', base).trim(), '', 'the base is there');
  assert.throws(() => git(clone, 'cat-file', '-e', `${original}^{commit}`), 'the clone cannot read the answer');
  const record: RunRecord = {
    task: 'fresh', model: null, turns: null, tokens: null, wallMs: null, hookMs: null, refusals: null, retries: null, base, cloneBase,
    originalTip: original, source, gates: [{ name: 'g_open', pass: null }],
  };
  const row = compareRow({ original: record, transcript: '', clone, gatesFile: null });
  assert.match(row, /\| g_open \| not measured \| not run \|/);
  assert.match(row, /files changed \| 2 \| 1 \|/, 'the kit file is not the new run\'s change');
  assert.match(row, /same as the original's: a\.txt/);
  assert.match(row, /only in the original: b\.txt/);
});

test('a record that names the original agent\'s own files is judged on those, not on a tip that carries merged work too', () => {
  const { dir, base, original } = plantedClone();
  const record: RunRecord = {
    task: 'own', model: null, turns: null, tokens: null, wallMs: null, hookMs: null, refusals: null, retries: null, base,
    originalTip: original, originalFiles: ['a.txt'], gates: [],
  };
  const row = compareRow({ original: record, transcript: '', clone: dir, gatesFile: null });
  assert.match(row, /files changed \| 1 \| 2 \|/);
  assert.match(row, /only in the original: none/);
  assert.match(row, /only in the new run: c\.txt/);
});
