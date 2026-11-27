// rules-held: the rules a session holds, read from the rule log. supernova2_monitor, 2026-11-27: the log rotates at 1 MB (57 times
// in thirteen days, about every two hours that day), and a rotation (or a restarted daemon) read only the new, short file, so a
// supervisor session held all day was given every matching rule again after each rotation (KWB-259).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { heldNow } from '../../../packs/base/hooks/lib/rules-held.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const row = (session: string, rule: string): string => `${JSON.stringify({ session, rule, why: 'shell_path_match' })}\n`;

test('a rule given before the log rotated is still held by the session (KWB-259)', () => {
  const dir = scratchDir('rules-held-');
  put(join(dir, '.claude/logs/rules-20261127-080000.jsonl'), row('old', 'gone') + row('s1', 'first'));
  put(join(dir, '.claude/logs/rules-20261127-100000.jsonl'), row('s1', 'second') + row('s2', 'other'));
  put(join(dir, '.claude/logs/rules.jsonl'), row('s1', 'third'));
  assert.deepEqual([...heldNow(dir, 's1', `${dir}\ns1`).rules].sort(), ['first', 'second', 'third']);
  assert.deepEqual([...heldNow(dir, 's2', `${dir}\ns2`).rules].sort(), ['other']);
});

test('a session that began after the last rotation reads no rotated log', () => {
  const dir = scratchDir('rules-held-new-');
  put(join(dir, '.claude/logs/rules-20261127-100000.jsonl'), row('old', 'gone'));
  put(join(dir, '.claude/logs/rules.jsonl'), row('s3', 'only'));
  assert.deepEqual([...heldNow(dir, 's3', `${dir}\ns3`).rules], ['only']);
});
