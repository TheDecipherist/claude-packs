// unread-writes.mts: an inline program that writes a file a content law judges is refused, so a law is never passed by writing
// around it (supernova2_monitor: six sessions wrote source and orders through python heredocs, WB-57 to WB-89; the user, 2026-11-22:
// "this needs to be ironclad in the harness").
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { unreadRefusal } from '../../../packs/base/hooks/lib/unread-writes.mts';
import type { HookEvent } from '../../../packs/base/hooks/lib/types.d.mts';

const bash = (command: string, cwd: string, hook_event_name = 'PreToolUse'): HookEvent => ({ hook_event_name, tool_name: 'Bash', tool_input: { command }, cwd });

function project(): string {
  const dir = scratchDir('unread-');
  put(join(dir, '.gitignore'), 'scratch/\n');
  spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

test('an inline program that writes a source file the hooks cannot read is refused, naming the file', () => {
  const dir = project();
  const said = unreadRefusal(bash("python3 -c \"x='src/a.ts'; open(g(x),'w').write(h())\"", dir), dir, {});
  assert.match(said, /^BLOCKED by unread-writes: this command writes src\/a\.ts/);
});

test('an order or a table written unread is refused too: the content laws judge them', () => {
  const dir = project();
  assert.match(unreadRefusal(bash("python3 - <<'EOF'\nopen(p('docs/workorders/x/workorder.md'),'w').write(t())\nEOF", dir), dir, {}),
    /writes docs\/workorders\/x\/workorder\.md/);
  assert.match(unreadRefusal(bash("node -e \"fs.writeFileSync(q('data/params.csv'), r())\"", dir), dir, {}), /writes data\/params\.csv/);
});

test('a write into a folder git ignores (a scratch probe) is not refused', () => {
  const dir = project();
  assert.equal(unreadRefusal(bash("python3 -c \"open(g('scratch/probe.py'),'w').write(h())\"", dir), dir, {}), '');
});

test('a plain redirect, a non-Bash tool, the wrong phase, a print and a write the hooks can read are not refused', () => {
  const dir = project();
  assert.equal(unreadRefusal(bash('echo x > a.ts', dir), dir, {}), '', 'no inline program: the hooks read it');
  assert.equal(unreadRefusal({ hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: 'a.ts' }, cwd: dir }, dir, {}), '');
  assert.equal(unreadRefusal(bash('python3 -c "print(1)"', dir, 'PostToolUse'), dir, {}), '');
  assert.equal(unreadRefusal(bash('python3 -c "print(1)"', dir), dir, {}), '');
  assert.equal(unreadRefusal(bash("python3 -c \"open('notes.ts','w').write('x')\"", dir), dir, {}), '', 'its text is known, so a law judged it');
});
