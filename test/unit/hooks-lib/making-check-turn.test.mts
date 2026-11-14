// making-check-turn.mts: what is wrong with the turn that ended, read from its transcript and the checkout's files, one line each.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { check, judgedBefore } from '../../../packs/base/hooks/lib/making-check-turn.mts';
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

// KWB-next: in an unattended session each Stop judged every write since the session began; another hook's send-back ends a stretch
// making-check already passed, and its own send-back does not.
test('making-check: another hook\'s Stop feedback is a boundary, its own is not', () => {
  const feedback = (text: string): Buffer => Buffer.from(`{"type":"user","message":{"role":"user","content":"Stop hook feedback:\\n${text}"}}`);
  assert.equal(judgedBefore(feedback('BLOCKED by run-keeps-going: nobody is there')), true);
  assert.equal(judgedBefore(feedback('BLOCKED by making-check: no making line')), false);
  assert.equal(judgedBefore(Buffer.from('{"type":"user","message":{"content":[{"type":"tool_result","content":"Stop hook feedback: x"}]}}')), false, 'a tool result quoting it');
});
