// making-check-turn.mts: what is wrong with the turn that ended, read from its transcript and the checkout's files, one line each.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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

test('a concept word written as a local name: the finding offers the rename beside the making line and the take-back (KWB-next, supernova2_monitor WB-29)', () => {
  const dir = scratchDir('mct-rename-');
  put(join(dir, 'design/shape.json'), toJson({ concepts: { part: { shape: 'many', count: 8, generator: 'partId(i, field)', words: ['part', 'parts'] } }, exclude: [] }));
  put(join(dir, 'build.md'), '# x\n\n## In progress\n\n- W2.2: making: the display measured; concepts: none; reuse: none\n\n## Log\n');
  const t = join(scratchDir('mct-rename-t-'), 't.jsonl');
  const write = { type: 'tool_use', id: 'w1', name: 'Write', input: { file_path: join(dir, 'scratch/scan.mjs'), content: 'const part = prof.slice(0, 4);\n' } };
  put(t, [toJson({ type: 'user', message: { content: 'measure the display' } }), toJson({ type: 'assistant', cwd: dir, message: { content: [write] } })].join('\n') + '\n');
  put(join(dir, 'scratch/scan.mjs'), 'const part = prof.slice(0, 4);\n');
  const problems = check({ hook_event_name: 'Stop', transcript_path: t, cwd: dir }, ctx(dir));
  const found = problems.find((p) => p.includes('does not name part'));
  assert.ok(found, `the local name is still read as the concept: ${problems.join(' | ')}`);
  assert.match(found ?? '', /rename/);
});

// KWB-next (2026-11-21): a throwaway probe in a folder git ignores (scratch/) is no part of what the turn makes; its words sent a turn back
// (supernova2_monitor W4.1). The same file where git keeps it is still judged
test('a concept word in a file git ignores is not judged; the same word in a kept file still is', () => {
  const dir = scratchDir('mct-ignored-');
  spawnSync('git', ['init', '-q'], { cwd: dir });
  put(join(dir, '.gitignore'), 'scratch/\n');
  put(join(dir, 'design/shape.json'), toJson({ concepts: { part: { shape: 'many', count: 8, generator: 'partId(i, field)', words: ['part', 'parts'] } }, exclude: [] }));
  put(join(dir, 'build.md'), '# x\n\n## In progress\n\n- W4.1: making: the record map; concepts: none; reuse: none\n\n## Log\n');
  const turnWriting = (file: string): string => {
    const t = join(scratchDir('mct-ignored-t-'), 't.jsonl');
    const write = { type: 'tool_use', id: 'w1', name: 'Write', input: { file_path: join(dir, file), content: 'const part = rows[0];\n' } };
    put(t, [toJson({ type: 'user', message: { content: 'map the record' } }), toJson({ type: 'assistant', cwd: dir, message: { content: [write] } })].join('\n') + '\n');
    put(join(dir, file), 'const part = rows[0];\n');
    return t;
  };
  const named = (file: string): boolean =>
    check({ hook_event_name: 'Stop', transcript_path: turnWriting(file), cwd: dir }, ctx(dir)).some((p) => p.includes('does not name part'));
  assert.equal(named('scratch/probe.mjs'), false, 'a probe git ignores is not judged');
  assert.equal(named('tools/probe.mjs'), true, 'the same in tools/ is');
});
