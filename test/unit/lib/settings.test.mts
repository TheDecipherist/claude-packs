// lib/settings.mts: the hooks the kit writes into .claude/settings.json, and what it leaves the project's own.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { HOOK_EXPORT, NODE_HOOK, RUNNER, forSettings, orderHooks, readSettings, runnable, syncSettings, unfold } from '../../../lib/settings.mjs';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { parseJson } from '../../../packs/base/hooks/lib/json.mts';

const node = (name: string, extra: object = {}) => ({ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${name}"`, timeout: 5, ...extra });

test('the kit-only keys role and order never reach a project\'s settings', () => {
  assert.deepEqual(forSettings({ command: 'c', role: 'judge', order: 1 }), { command: 'c' });
});

test('unfold turns an older install\'s runner command back into one entry per hook, other entries untouched', () => {
  const folded = { type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${RUNNER}" .claude/hooks/a.mjs .claude/hooks/b.mjs`, timeout: 10 };
  assert.deepEqual(unfold([folded, { command: 'mine' }]).map((h) => h.command), [node('a.mjs').command, node('b.mjs').command, 'mine']);
  assert.deepEqual(unfold([{ command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${RUNNER}"` }]).map((h) => h.command), [`node "$CLAUDE_PROJECT_DIR/.claude/hooks/${RUNNER}"`], 'the new runner entry names no hook: left as it is');
});

test('HOOK_EXPORT takes a hook on either contract, and refuses a file with no export hook', () => {
  assert.ok(HOOK_EXPORT.test('export const hook = main;'));
  assert.ok(HOOK_EXPORT.test('export const hook: Hook = (event, ctx) => pass;'));
  assert.ok(HOOK_EXPORT.test('export { main as hook };'));
  assert.ok(!HOOK_EXPORT.test('export const hooks = 1; // the hook'));
  assert.ok(NODE_HOOK.test(node('a.mjs').command));
  const claude = scratchDir('settings-runnable-');
  put(join(claude, 'hooks', 'new.mjs'), 'export const hook = (event, ctx) => 0;');
  put(join(claude, 'hooks', 'old.mjs'), 'process.exit(0);');
  assert.deepEqual([runnable(claude)('new.mjs'), runnable(claude)('old.mjs'), runnable(claude)('gone.mjs')], [true, false, false]);
});

test('orderHooks puts the kit hooks in their rows\' order and leaves the project\'s own where they were (was: the configuration\'s order)', () => {
  const ours = (c = '') => c.includes('.claude/hooks/');
  const hooks = [node('b.mjs', { order: 20 }), { command: 'mine' }, node('a.mjs', { order: 10 }), node('z.mjs')];
  assert.deepEqual(orderHooks(hooks, ours).map((h) => h.command?.split('/').pop() ?? h.command), ['a.mjs"', 'mine', 'b.mjs"', 'z.mjs"'], 'a row with no order goes last');
  const plain = [node('b.mjs'), { command: 'mine' }, node('a.mjs')];
  assert.deepEqual(orderHooks(plain, ours), plain, 'no orders: pack order');
});

test('readSettings: none is empty, malformed throws with nothing written', () => {
  const claude = scratchDir('settings-read-');
  assert.deepEqual(readSettings(claude), {});
  put(join(claude, 'settings.json'), '{ nope');
  assert.throws(() => syncSettings(claude, ['base']), /settings\.json is not valid JSON/);
  assert.equal(readText(join(claude, 'settings.json')), '{ nope');
});

test('syncSettings keeps the project\'s own hook and a retired kit entry goes, with siblings added once', () => {
  const claude = scratchDir('settings-sync-');
  put(join(claude, 'settings.json'), JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo mine' }, node('git-guard.py')] }] } }));
  const result = syncSettings(claude, ['base'], { siblings: ['../'] });
  assert.deepEqual(result.retired, ['git-guard.py']);
  const settings = parseJson<{ hooks: Record<string, { hooks: { command: string }[] }[]>; permissions: { additionalDirectories: string[] } }>(readText(join(claude, 'settings.json')));
  const bash = settings?.hooks.PreToolUse?.find((g) => g.hooks.some((h) => h.command === 'echo mine'));
  assert.ok(bash, 'the project\'s own hook survives');
  assert.ok(!JSON.stringify(settings).includes('git-guard.py'));
  assert.deepEqual(settings?.permissions.additionalDirectories, ['../']);
  syncSettings(claude, ['base'], { siblings: ['../'] });
  assert.deepEqual(parseJson<typeof settings>(readText(join(claude, 'settings.json')))?.permissions.additionalDirectories, ['../']);
});
