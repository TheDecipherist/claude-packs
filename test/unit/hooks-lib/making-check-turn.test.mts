// making-check-turn.mts: what is wrong with the turn that ended, read from its transcript and the checkout's files, one line each.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { check } from '../../../packs/base/hooks/lib/making-check-turn.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';

const turnOf = (dir: string, text: string): string => {
  const f = join(scratchDir('mct-t-'), 't.jsonl');
  put(f, [toJson({ type: 'user', message: { content: 'build it' } }), toJson({ type: 'assistant', cwd: dir, message: { content: [{ type: 'text', text }] } })].join('\n') + '\n');
  return f;
};
const ctx = (dir: string) => ({ projectDir: dir, cwd: dir, env: {} });

test('a turn that wrote nothing and claims nothing has no problem', () => {
  const dir = scratchDir('mct-');
  assert.deepEqual(check({ hook_event_name: 'Stop', transcript_path: turnOf(dir, 'All done, nothing to change.'), cwd: dir }, ctx(dir)), []);
});

test('a planted turn that says it did something other than it was told is found', () => {
  const dir = scratchDir('mct-');
  const problems = check({ hook_event_name: 'Stop', transcript_path: turnOf(dir, 'I deviated from the brief and did it my way.'), cwd: dir }, ctx(dir));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /other than it was told/);
});

test('a missing transcript is a turn with nothing in it, never a throw', () => {
  const dir = scratchDir('mct-');
  assert.deepEqual(check({ hook_event_name: 'Stop', transcript_path: join(dir, 'none.jsonl'), cwd: dir }, ctx(dir)), []);
});
