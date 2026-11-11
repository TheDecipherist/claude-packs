// layout.mts: layout.json read afresh each time, concepts expanded to globs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { codeFolders, conceptGlobs, globsForConcepts, readLayout, resolveAliases } from '../../../packs/base/hooks/lib/layout.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import type { Layout } from '../../../packs/base/hooks/lib/types.d.mts';

const layout: Layout = {
  folders: { src: { path: 'src' }, docs: { path: 'docs' }, core: { path: 'src/core' }, tabula: { path: 'lib/tabula/', kind: 'copy' } },
  concepts: { code: ['core', '**/*.go'], copies: ['kind:copy'], gone: [] },
  files: { spec: 'docs/spec.md' },
};

test('readLayout: the file as it is now (no memo), empty when missing or planted wrong', () => {
  const dir = scratchDir('layout-');
  assert.deepEqual(readLayout(dir), { folders: {}, concepts: {} });
  put(join(dir, '.claude/layout.json'), '{"folders":{"a":{"path":"a"}},"concepts":{}}');
  assert.equal(readLayout(dir).folders['a']?.path, 'a');
  put(join(dir, '.claude/layout.json'), '{"folders":{"b":{"path":"b"}},"concepts":{}}');   // changed at once, no stale copy
  assert.equal(readLayout(dir).folders['b']?.path, 'b');
  put(join(dir, '.claude/layout.json'), '{ not json');
  assert.deepEqual(readLayout(dir), { folders: {}, concepts: {} });
});

test('conceptGlobs and globsForConcepts: a folder name, kind:, a raw glob; an unknown concept is skipped; none at all throws', () => {
  assert.deepEqual(conceptGlobs(layout, 'code'), ['src/core/**', '**/*.go']);
  assert.deepEqual(conceptGlobs(layout, 'copies'), ['lib/tabula/**']);
  assert.equal(conceptGlobs(layout, 'nope'), null);
  assert.deepEqual(globsForConcepts(layout, ['code', 'nope', 'copies']), ['src/core/**', '**/*.go', 'lib/tabula/**']);
  assert.throws(() => globsForConcepts(layout, ['nope']), /none of the concepts/);
});

test('codeFolders: docs and tools out, src out when folders sit inside it, deepest first; resolveAliases', () => {
  assert.deepEqual(codeFolders(layout), ['lib/tabula/', 'src/core']);
  assert.deepEqual(codeFolders({ folders: { src: { path: 'src' }, docs: { path: 'docs' } }, concepts: {} }), ['src']);
  assert.deepEqual(resolveAliases(layout, ['@spec', '@nope', 'x/**']), ['docs/spec.md', '__missing_alias_nope__', 'x/**']);
});
