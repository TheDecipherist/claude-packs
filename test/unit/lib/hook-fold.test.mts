// lib/hook-fold.mts: one runner entry per event, with the union of its hooks' matchers, and the table the runner reads (W8.1, d-9).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { foldEvents } from '../../../lib/hook-fold.mts';
import type { ReadGroup } from '../../../lib/hook-entries.mts';

const node = (name: string, extra: object = {}) => ({ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${name}"`, timeout: 5, ...extra });
const RUN = 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/run-hooks.mjs"';

test('the kit hooks of an event become one runner entry, its matcher the union of theirs, its timeout their sum', () => {
  const events: Record<string, ReadGroup[]> = {
    PreToolUse: [
      { matcher: 'Write|Edit|Bash', hooks: [node('a.mjs', { order: 10, role: 'judge' }), node('b.mjs', { order: 20, role: 'recorder' })] },
      { matcher: 'Bash', hooks: [node('c.mjs')] },
      { matcher: 'Agent|Task', hooks: [node('a.mjs', { order: 10, role: 'judge' })] },
    ],
  };
  const rows = foldEvents(events);
  assert.deepEqual(events.PreToolUse, [{ matcher: 'Write|Edit|Bash|Agent|Task', hooks: [{ type: 'command', command: RUN, timeout: 20 }] }]);
  assert.deepEqual(rows.map((r) => [r.hook, r.matcher, r.order, r.role]), [
    ['a', 'Write|Edit|Bash', 10, 'judge'], ['b', 'Write|Edit|Bash', 20, 'recorder'], ['c', 'Bash', undefined, 'judge'], ['a', 'Agent|Task', 10, 'judge'],
  ]);
});

test('a hook with no matcher makes the runner entry take every call; the same hook in two events is one row', () => {
  const events: Record<string, ReadGroup[]> = {
    PreToolUse: [{ matcher: 'Bash', hooks: [node('a.mjs')] }, { hooks: [node('b.mjs')] }],
    Stop: [{ hooks: [node('b.mjs')] }],
  };
  const rows = foldEvents(events);
  assert.equal(events.PreToolUse?.[0]?.matcher, undefined);
  assert.deepEqual(rows.filter((r) => r.hook === 'b').map((r) => r.events), [['PreToolUse', 'Stop']]);
});

test('an async hook, a hook the runner cannot run and the project\'s own keep their own entries, the runner entry in the first group\'s place', () => {
  const events: Record<string, ReadGroup[]> = {
    Stop: [
      { hooks: [node('slow.mjs', { asyncRewake: true, timeout: 1000 })] },
      { hooks: [{ type: 'command', command: 'echo mine' }, node('a.mjs'), node('old.mjs'), node('own.mjs')] },
    ],
  };
  const rows = foldEvents(events, (name) => name !== 'old.mjs' && name !== 'own.mjs');
  assert.deepEqual(events.Stop?.map((g) => g.hooks.map((h) => (h.command ?? '').split('/').pop())), [['slow.mjs"'], ['run-hooks.mjs"'], ['echo mine', 'old.mjs"', 'own.mjs"']]);
  assert.deepEqual(rows.map((r) => [r.hook, r.asyncRewake ?? false]), [['slow', true], ['a', false]], 'the async row is in the table, marked, for the daemon to skip');
  assert.equal(events.Stop?.[0]?.hooks[0]?.timeout, 1000);
});

test('an event with only async or foreign hooks gets no runner entry (a base-only project starts nothing on a tool none of its hooks judge)', () => {
  const events: Record<string, ReadGroup[]> = { PreToolUse: [{ hooks: [node('beat.mjs', { async: true })] }] };
  foldEvents(events);
  assert.deepEqual(events.PreToolUse?.flatMap((g) => g.hooks.map((h) => h.command)), [node('beat.mjs').command]);
  assert.ok(!JSON.stringify(events).includes('run-hooks'));
});

test('the kit-only keys role and order never reach settings', () => {
  const events: Record<string, ReadGroup[]> = { Stop: [{ hooks: [node('slow.mjs', { async: true, role: 'recorder', order: 3 })] }] };
  foldEvents(events);
  assert.deepEqual(Object.keys(events.Stop?.[0]?.hooks[0] ?? {}).filter((k) => k === 'role' || k === 'order'), []);
});
