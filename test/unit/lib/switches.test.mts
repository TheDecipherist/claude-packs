// lib/switches.mts: what an install switches on. A new hook or check never switches on in a project that did not choose it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reportSwitches, switches } from '../../../lib/switches.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import type { Layout, Lock } from '../../../packs/base/hooks/lib/types.d.mts';

const LAYOUT: Layout = { folders: {}, concepts: {} };
const lockOf = (packs: readonly string[], files: Record<string, string> = {}): Lock => ({ kit: '2.0.0', packs, files });

test('a pack the project is choosing now brings its hooks and checks, except its opt-in ones', () => {
  const { on, held } = switches(scratchDir('switch-'), ['base', 'postgres'], LAYOUT, lockOf([]));
  assert.ok(on.includes('hooks/git-guard.mjs'), 'a hook comes on');
  assert.ok(on.every((p) => /^(hooks|checks)\//.test(p)), 'only hooks and checks are switches');
  assert.ok(!on.includes('checks/pg-timestamptz.json') && held.includes('checks/pg-timestamptz.json'), 'an opt-in check is held');
});

test('a hook a pack names onByDefault is on in a project that already had the pack, with no enable', () => {
  const { on } = switches(scratchDir('switch-law-'), ['base'], LAYOUT, lockOf(['base']));
  assert.ok(on.includes('hooks/shape-law.mjs'));
});

test('a pack the project already had holds back a hook it never had, until layout.json enable names it', () => {
  const dir = scratchDir('switch-had-');
  const had = switches(dir, ['base'], LAYOUT, lockOf(['base']));
  assert.ok(had.held.includes('hooks/git-guard.mjs'));
  assert.ok(!had.on.includes('hooks/git-guard.mjs'));
  const named = switches(dir, ['base'], { ...LAYOUT, enable: ['hooks/git-guard.mjs'] }, lockOf(['base']));
  assert.ok(named.on.includes('hooks/git-guard.mjs'));
});

test('what the project already has stays on: a hook in the lock is in neither list (a planted wrong input: the lock names it)', () => {
  const { on, held } = switches(scratchDir('switch-lock-'), ['base'], LAYOUT, lockOf(['base'], { '.claude/hooks/git-guard.mjs': 'abc' }));
  assert.ok(![...on, ...held].includes('hooks/git-guard.mjs'));
});

test('reportSwitches says both lists, and nothing for an empty one', () => {
  const said: string[] = [];
  reportSwitches({ on: ['hooks/a.mjs'], held: ['checks/b.json'] }, (l) => said.push(l));
  assert.equal(said.length, 2);
  assert.match(said[0] ?? '', /switching on \(new to this project\): hooks\/a\.mjs/);
  assert.match(said[1] ?? '', /held back, not switched on .*: checks\/b\.json/);
  const none: string[] = [];
  reportSwitches({ on: [], held: [] }, (l) => none.push(l));
  assert.deepEqual(none, []);
});
