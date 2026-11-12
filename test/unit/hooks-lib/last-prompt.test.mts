// last-prompt.mts (KWB-201): the user's prompt of the turn, read once per transcript and offset. no-find and suite-once asked it on every Pre
// Bash call and each read the whole transcript (140 ms and 180 MB of a worker's RSS on a 25 MB one); now the second call reads nothing
// and a grown file is read from where it was last read to.
import assert from 'node:assert/strict';
import { appendFileSync, truncateSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { bytesRead, lastPrompt } from '../../../packs/base/hooks/lib/last-prompt.mts';

const user = (text: string): string => `${toJson({ type: 'user', message: { content: text } })}\n`;
const result = (n: number, size: number): string => `${toJson({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: `t${n}`, content: 'x'.repeat(size) }] } })}\n`;
const fileOf = (): string => join(scratchDir('last-prompt-'), 't.jsonl');

/** A transcript of about 30 MB: the prompt first, then tool results, which are no prompts. */
function big(): string {
  const f = fileOf();
  writeFileSync(f, user('run everything and do not stop'));
  for (let n = 0; n < 150; n += 1) appendFileSync(f, result(n, 200 * 1024));
  return f;
}

test('the second call on a 30 MB transcript reads no byte, and the first reads the file once, not in growing windows', () => {
  const f = big();
  const t0 = bytesRead();
  assert.equal(lastPrompt(f), 'run everything and do not stop');
  const first = bytesRead() - t0;
  assert.ok(first <= 31 * 1024 * 1024, `the first call read ${first} bytes`);
  const t1 = bytesRead();
  assert.equal(lastPrompt(f), 'run everything and do not stop');
  assert.equal(bytesRead() - t1, 0);
});

test('a grown transcript is read from the last offset only, and a new prompt replaces the old', () => {
  const f = big();
  assert.equal(lastPrompt(f), 'run everything and do not stop');
  appendFileSync(f, result(999, 1000));
  const t0 = bytesRead();
  assert.equal(lastPrompt(f), 'run everything and do not stop');
  assert.ok(bytesRead() - t0 < 4096, `read ${bytesRead() - t0} bytes for 1 KB of new text`);
  appendFileSync(f, user('now something else'));
  appendFileSync(f, user('Stop hook feedback: fix it'));
  assert.equal(lastPrompt(f), 'now something else');
  assert.ok(bytesRead() - t0 < 8192);
});

test('a line still being written is read when it is whole, and a truncated transcript is read again', () => {
  const f = fileOf();
  writeFileSync(f, user('first'));
  assert.equal(lastPrompt(f), 'first');
  const second = user('second');
  appendFileSync(f, second.slice(0, 20));
  assert.equal(lastPrompt(f), 'first', 'half a line is no prompt yet');
  appendFileSync(f, second.slice(20));
  assert.equal(lastPrompt(f), 'second');
  truncateSync(f, 0);
  writeFileSync(f, user('after a rewrite'));
  assert.equal(lastPrompt(f), 'after a rewrite');
});

test('a transcript with no prompt, or none at all, has none', () => {
  const f = fileOf();
  writeFileSync(f, result(1, 10));
  assert.equal(lastPrompt(f), '');
  assert.equal(lastPrompt('/no/such/transcript'), '');
});
