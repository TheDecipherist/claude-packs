// lib/found-folders.mts: the folders a first install finds the project's source in (KWB-83), and the seed layout that carries them.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { foundFolders, withFoundFolders } from '../../../lib/found-folders.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import type { Configuration } from '../../../packs/base/hooks/lib/types.d.mts';

const CONFIG: Configuration = { packs: { always: [], choose: [], default: [] } };

function project(): string {
  const dir = scratchDir('found-');
  put(`${dir}/lib/a.ts`, 'export const a = 1;\n');
  put(`${dir}/engine/b.cpp`, 'int b;\n');
  put(`${dir}/lib/net/c.ts`, 'export const c = 1;\n');
  put(`${dir}/node_modules/x/index.js`, 'x\n');
  put(`${dir}/docs/guide.ts`, 'doc\n');
  put(`${dir}/README.md`, '# readme\n');
  return dir;
}

test('the top-level folders holding source are found, sorted; fetched, built and docs folders are not', () => {
  assert.deepEqual(foundFolders(project(), undefined), ['engine', 'lib']);
});

test('a folder the layout already has by name is left out, and the configuration\'s own source pattern decides what is source', () => {
  const dir = project();
  assert.deepEqual(foundFolders(dir, undefined, ['lib']), ['engine']);
  assert.deepEqual(foundFolders(dir, '\\.cpp$'), ['engine']);
});

test('a project with no source folder gives none (a planted wrong input: only a root file)', () => {
  const dir = scratchDir('found-none-');
  put(`${dir}/main.ts`, 'x\n');
  assert.deepEqual(foundFolders(dir, undefined), []);
});

test('a seed layout gets the found folders, said once, and a complete one is left exactly as it is', () => {
  const dir = project();
  const said: string[] = [];
  const seed = withFoundFolders(dir, { folders: { own: { path: 'own', purpose: 'mine' } }, concepts: {} }, CONFIG, (l) => said.push(l));
  assert.deepEqual(Object.keys(seed?.folders ?? {}).sort(), ['engine', 'lib', 'own']);
  assert.equal(seed?.folders?.['lib']?.path, 'lib');
  assert.match(said.join('\n'), /your source is in engine\/, lib\/, so the layout has them/);
  const complete = { complete: true, folders: {}, concepts: {} };
  assert.equal(withFoundFolders(dir, complete, CONFIG, (l) => said.push(l)), complete);
  assert.equal(withFoundFolders(scratchDir('found-empty-'), null, CONFIG, () => undefined), null);
});
