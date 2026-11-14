// turn.mts: the last turn of a transcript, read from its end, and the files its calls wrote since its last landing.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { bytesDecoded, lastPrompt, lastTurn, writesOfTurn } from '../../../packs/base/hooks/lib/turn.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';

const user = (text: string): string => toJson({ type: 'user', message: { content: text } });
const asst = (...content: unknown[]): string => toJson({ type: 'assistant', cwd: '/w', message: { content } });
const tool = (id: string, name: string, input: Record<string, unknown>): unknown => ({ type: 'tool_use', id, name, input });
const transcript = (lines: string[]): string => { const f = join(scratchDir('turn-'), 't.jsonl'); put(f, `${lines.join('\n')}\n`); return f; };

test('the turn is what follows the last real prompt; a tool that was refused is not counted', () => {
  const f = transcript([user('old prompt'), asst({ type: 'text', text: 'old' }), user('do it'), asst({ type: 'text', text: 'on it' }, tool('1', 'Write', { file_path: 'a.ts', content: 'x' }), tool('2', 'Write', { file_path: 'b.ts', content: 'y' })),
    toJson({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: '2', is_error: true }] } })]);
  assert.equal(lastPrompt(f), 'do it');
  const turn = lastTurn(f);
  assert.equal(turn.text, 'on it');
  assert.deepEqual(turn.uses.map((u) => u.id), ['1']);
});

test('a hook\'s feedback is not a prompt, and a torn last line is dropped', () => {
  const f = transcript([user('real'), asst({ type: 'text', text: 'a' }), user('Stop hook feedback: fix'), asst({ type: 'text', text: 'b' }), '{"type":"assis']);
  assert.equal(lastPrompt(f), 'real');
  assert.equal(lastTurn(f).text, 'a\nb');
});

test('a caller\'s boundary ends the turn there; without one the turn runs back to the prompt (KWB-next)', () => {
  const f = transcript([user('run'), asst({ type: 'text', text: 'a' }, tool('1', 'Write', { file_path: 'a.ts', content: 'x' })),
    user('Stop hook feedback: BLOCKED by run-keeps-going'), asst({ type: 'text', text: 'b' }, tool('2', 'Write', { file_path: 'b.ts', content: 'y' }))]);
  assert.deepEqual(lastTurn(f).uses.map((u) => u.id), ['1', '2']);
  assert.deepEqual(lastTurn(f, (line) => line.includes('Stop hook feedback')).uses.map((u) => u.id), ['2']);
});

test('a 30 MB turn of tool results is read without decoding them: its calls are found and under 1 MB is made strings (rss)', () => {
  // an unattended run's turn is the whole transcript; each Stop's two turn readers decoded and parsed all of it, 213 MB of a worker's RSS on 25 MB
  const f = join(scratchDir('turn-big-'), 't.jsonl');
  const lines = [user('run everything')];
  for (let n = 0; n < 150; n += 1) {
    lines.push(asst(tool(`t${n}`, 'Bash', { command: `ls ${n}` })));
    lines.push(toJson({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: `t${n}`, content: 'x'.repeat(200 * 1024) }] } }));
  }
  lines.push(toJson({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't7', is_error: true, content: 'refused' }] } }));
  put(f, `${lines.join('\n')}\n`);
  const before = bytesDecoded();
  const turn = lastTurn(f);
  const decoded = bytesDecoded() - before;
  assert.equal(turn.uses.length, 149);
  assert.ok(!turn.uses.some((u) => u.id === 't7'), 'the refused call is left out');
  assert.ok(decoded < 1024 * 1024, `the turn's reader decoded ${decoded} bytes`);
});

test('a turn whose prompt is the last line holds nothing, and a file with no prompt is all one turn', () => {
  assert.deepEqual(lastTurn(transcript([asst({ type: 'text', text: 'before' }), user('now')])), { text: '', uses: [] });
  assert.equal(lastTurn(transcript([asst({ type: 'text', text: 'a' }), asst({ type: 'text', text: 'b' })])).text, 'a\nb');
});

test('a planted missing transcript is an empty turn', () => {
  assert.equal(lastPrompt('/no/such/file'), '');
  assert.deepEqual(lastTurn('/no/such/file'), { text: '', uses: [] });
});

test('writesOfTurn lists the files written since the last landing, with the text, in the call\'s own folder', () => {
  const uses = [{ name: 'Write', input: { file_path: 'old.ts', content: 'o' } }, { name: 'Bash', input: { command: 'git merge --ff-only origin/main' } },
    { name: 'Edit', input: { file_path: 'a.ts', old_string: 'x', new_string: 'new' }, cwd: '/p' }, { name: 'Bash', input: { command: 'echo hi > out.txt' } }, { name: 'Read', input: { file_path: 'r' } }];
  assert.deepEqual(writesOfTurn({ uses }, '/w', {}), [{ path: '/p/a.ts', text: 'new', tool: 'Edit' }, { path: '/w/out.txt', text: 'hi\n', tool: 'Bash' }]);
});
