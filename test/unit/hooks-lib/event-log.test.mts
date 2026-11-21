// event-log.mts: the lines a hook call leaves in the logs, and the id of a refusal (sha1, 8 digits: the ids already written stay the same).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { CRASHES, EVENTS, REFUSALS, checkoutHead, logCall } from '../../../packs/base/hooks/lib/event-log.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';

const collect = (): { written: { file: string; row: Record<string, unknown> }[]; append: (root: string, file: string, line: string) => void } => {
  const written: { file: string; row: Record<string, unknown> }[] = [];
  return { written, append: (_root, file, line) => { written.push({ file, row: JSON.parse(line) }); } };
};

test('a refusal is a line in events and in refusals, its id the first 8 digits of the sha1', () => {
  const { written, append } = collect();
  const event = JSON.stringify({ session_id: 's1', tool_name: 'Write', tool_input: { file_path: '/p/a.js', content: 'abc' } });
  logCall('/nowhere', event, [{ hook: 'once-only', ms: 3.4, code: 2, reason: 'a copy' }], append, 10);
  assert.deepEqual(written.map((w) => w.file), [EVENTS, REFUSALS]);
  const refusal = written[1]?.row;
  assert.ok(refusal);
  assert.equal(refusal.id, createHash('sha1').update(`${String(refusal.t)}once-onlya copy`).digest('hex').slice(0, 8));
  assert.equal(refusal.bytes, 3);
});

test('a crash goes to the crash log, and text that is no event is still a line', () => {
  const { written, append } = collect();
  logCall('/nowhere', 'not json', [{ hook: 'h', ms: 1, code: 1, reason: 'boom' }], append);
  assert.deepEqual(written.map((w) => w.file), [EVENTS, CRASHES]);
});

test('checkoutHead reads the branch and commit from files, and nothing from a missing folder', () => {
  const dir = scratchDir('head-');
  put(join(dir, '.git', 'HEAD'), 'ref: refs/heads/work/x\n');
  put(join(dir, '.git', 'refs', 'heads', 'work', 'x'), 'abcdef0123456789\n');
  assert.deepEqual(checkoutHead(dir), { branch: 'work/x', commit: 'abcdef012345' });
  assert.deepEqual(checkoutHead(join(dir, 'nowhere')), {});
});

// KWB-next (2026-11-21): stay-inside's two wrong halts on the user's memory note left no refusal row, so neither could be marked wrong
test('a halt (exit 0, continue false) is a refusal line marked halt, with its stop reason; a plain pass and a message are not', () => {
  const { written, append } = collect();
  const halted = toJson({ continue: false, stopReason: 'STOPPED by stay-inside: outside', hookSpecificOutput: { hookEventName: 'PreToolUse' } });
  const hooks = [
    { hook: 'stay-inside', ms: 1, code: 0, out: halted },
    { hook: 'quiet', ms: 1, code: 0, out: '' },
    { hook: 'says', ms: 1, code: 0, out: toJson({ systemMessage: 'note', continue: true }) },
  ];
  logCall('/nowhere', toJson({ session_id: 's1', tool_name: 'Write', tool_input: { file_path: '/x/a.md' } }), hooks, append);
  assert.deepEqual(written.map((w) => w.file), [EVENTS, REFUSALS], 'one refusal line, for the halt alone');
  const row = written[1]?.row;
  assert.equal(row?.hook, 'stay-inside');
  assert.equal(row?.halt, true);
  assert.equal(row?.reason, 'STOPPED by stay-inside: outside');
  assert.equal(row?.id, createHash('sha1').update(`${String(row?.t)}stay-insideSTOPPED by stay-inside: outside`).digest('hex').slice(0, 8));
});
