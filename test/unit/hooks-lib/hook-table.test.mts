// lib/hook-table.mts: which hooks of the table an event reaches, in which order (W8.1).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hookRowsFor, matcherReaches, unionMatcher } from '../../../packs/base/hooks/lib/hook-table.mts';
import type { HookTableRow } from '../../../packs/base/hooks/lib/types.d.mts';

const row = (hook: string, extra: Partial<HookTableRow> = {}): HookTableRow => ({ hook, events: ['PreToolUse'], role: 'judge', ...extra });

test('matchers: none, empty and * take everything; a plain list is matched whole; anything else is an expression', () => {
  assert.deepEqual([undefined, '', '*'].map((m) => matcherReaches(m, 'Glob')), [true, true, true]);
  assert.deepEqual([matcherReaches('Bash|Write', 'Bash'), matcherReaches('Bash|Write', 'BashOutput'), matcherReaches('Bash', undefined)], [true, false, false]);
  assert.deepEqual([matcherReaches('mcp__.*', 'mcp__a__b'), matcherReaches('mcp__.*', 'Bash'), matcherReaches('(', 'x')], [true, false, false]);
});

test('the union of matchers: none when one takes all, plain names joined once, expressions grouped', () => {
  assert.equal(unionMatcher(['Bash', undefined]), undefined);
  assert.equal(unionMatcher(['Write|Bash', 'Bash|Read']), 'Write|Bash|Read');
  assert.equal(unionMatcher(['Bash', 'mcp__.*']), 'Bash|(?:mcp__.*)');
});

test('an event gets its rows in the table\'s order, a hook once, async rows never', () => {
  const table = [row('c', { order: 30 }), row('a', { order: 10, matcher: 'Bash' }), row('a', { order: 10 }), row('z'), row('b', { async: true, order: 1 }), row('s', { events: ['Stop'] })];
  assert.deepEqual(hookRowsFor(table, { hook_event_name: 'PreToolUse', tool_name: 'Bash' }).map((r) => r.hook), ['a', 'c', 'z']);
  assert.deepEqual(hookRowsFor(table, { hook_event_name: 'Stop' }).map((r) => r.hook), ['s']);
  assert.deepEqual(hookRowsFor(table, { hook_event_name: 'SessionStart', source: 'compact' }), []);
});
