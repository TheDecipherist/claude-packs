// unread-writes.mts: names what an inline program wrote to source that no hook could read, so a pass is not taken for a judgement.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseJson } from '../../../packs/base/hooks/lib/json.mts';
import { unreadWrites } from '../../../packs/base/hooks/lib/unread-writes.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import type { HookEvent } from '../../../packs/base/hooks/lib/types.d.mts';

const bash = (command: string, cwd: string, hook_event_name = 'PreToolUse'): HookEvent => ({ hook_event_name, tool_name: 'Bash', tool_input: { command }, cwd });

test('an inline program that writes a source file the hooks cannot read is named', () => {
  const dir = scratchDir('unread-');
  const out = unreadWrites(bash("python3 -c \"x='src/a.ts'; open(g(x),'w').write(h())\"", dir), dir, {});
  const said = parseJson<{ systemMessage?: string }>(out);
  assert.match(said?.systemMessage ?? '', /not judged/);
});

test('a plain redirect, a non-Bash tool, the wrong phase and a non-source file say nothing', () => {
  const dir = scratchDir('unread-');
  assert.equal(unreadWrites(bash('echo x > a.ts', dir), dir, {}), '', 'no inline program: the hooks read it');
  assert.equal(unreadWrites({ hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: 'a.ts' }, cwd: dir }, dir, {}), '');
  assert.equal(unreadWrites(bash('python3 -c "print(1)"', dir, 'PostToolUse'), dir, {}), '');
  assert.equal(unreadWrites(bash('python3 -c "print(1)"', dir), dir, {}), '');
});

test('a planted program that writes a file read in full by the hooks is not unread', () => {
  const dir = scratchDir('unread-');
  assert.equal(unreadWrites(bash("python3 -c \"open('notes.ts','w').write('x')\"", dir), dir, {}), '', 'its text is known, so a law judged it');
});
