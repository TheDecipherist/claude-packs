// lib/layout.mts: the CLI's buildLayout writes a project's layout.json and keeps every edit the user made.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { OWNED, buildLayout } from '../../../lib/layout.mjs';
import { readConfig } from '../../../lib/configs.mjs';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { parseJson } from '../../../packs/base/hooks/lib/json.mts';
import type { Layout } from '../../../packs/base/hooks/lib/types.d.mts';

const read = (claude: string): Layout | null => parseJson<Layout>(readText(join(claude, 'layout.json')));

test('a first install writes the pack folders, the house git guards and followFolders, and returns what it wrote', () => {
  const claude = scratchDir('layout-first-');
  const config = readConfig('node');
  const layout = buildLayout(claude, config.packs.always, null, config);
  assert.deepEqual(read(claude), layout);
  assert.ok(Object.keys(layout.folders).length > 0);
  assert.equal((layout.guards?.git as { house?: boolean }).house, true);
  assert.equal(layout.followFolders, true);
  assert.deepEqual(layout.ruleTests, {});
  assert.ok((readText(join(claude, 'layout.json')) ?? '').endsWith('}\n'));
});

test('an install that names a configuration records it and seeds its sourceFiles once', () => {
  const claude = scratchDir('layout-config-');
  const config = readConfig('synth-creator');
  const layout = buildLayout(claude, config.packs.always, null, config);
  assert.equal(layout.configuration, 'synth-creator');
  if (config.sourceFiles) assert.equal(layout.sourceFiles, config.sourceFiles);
});

test('an update keeps what the user changed: a folder, a command, a disable, and a key the kit does not know', () => {
  const claude = scratchDir('layout-keep-');
  buildLayout(claude, ['base']);
  const mine = read(claude);
  assert.ok(mine);
  mine.folders['mine'] = { path: 'mine', purpose: 'my own' };
  mine.commands = { test: 'make check' };
  mine.disable = ['hooks/x.mjs'];
  put(join(claude, 'layout.json'), JSON.stringify(mine));
  const again = buildLayout(claude, ['base']);
  assert.equal(again.folders['mine']?.purpose, 'my own');
  assert.deepEqual(again.commands, { test: 'make check' });
  assert.deepEqual(again.disable, ['hooks/x.mjs']);
  for (const key of OWNED) assert.ok(key in again || !['files', 'commands', 'protected', 'disable', 'enable', 'siblings'].includes(key), key);
});

test('a layout.json that is not JSON stops the install and is left as it was (a planted bad file)', () => {
  const claude = scratchDir('layout-bad-');
  put(join(claude, 'layout.json'), '{ nope');
  assert.throws(() => buildLayout(claude, ['base']), /layout\.json is not valid JSON/);
  assert.equal(readText(join(claude, 'layout.json')), '{ nope');
});

test('a "complete" layout gets no default folders from the packs', () => {
  const claude = scratchDir('layout-complete-');
  const layout = buildLayout(claude, ['base'], { complete: true, folders: { app: { path: 'app', purpose: 'x' } }, concepts: {} });
  assert.deepEqual(Object.keys(layout.folders), ['app']);
  assert.equal(layout.complete, true);
});
