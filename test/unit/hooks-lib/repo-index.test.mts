// repo-index.mts: per file, its element shapes, statements and definitions, kept in the temp folder and read again only for what moved.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { oneOffLines, repoIndex, shapesOfText } from '../../../packs/base/hooks/lib/repo-index.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('a one-off: line covers what follows it down to the next blank line', () => {
  assert.deepEqual([...oneOffLines('a\n// one-off: x\nb\nc\n\nd\n')].sort(), [2, 3, 4]);
  assert.deepEqual([...oneOffLines('')], []);
});

test('a generated file holds no shapes; a marked one-off is left out', () => {
  assert.deepEqual(shapesOfText('// auto-generated\nfunction f() { return 1; }\n', 'a.ts'), { shapes: [], st: [], defs: [] });
  const text = 'function keep() {\n  const a = 1;\n  return a;\n}\n\n// one-off: x\nfunction skip() {\n  const b = 2;\n  return b;\n}\n';
  const names = shapesOfText(text, 'a.ts').defs.map(([n]) => n);
  assert.ok(names.includes('keep'));
  assert.ok(!names.includes('skip'));
});

test('the index holds each code file, keeps an unchanged one as it was, and re-reads a changed one', () => {
  const dir = scratchDir('repoidx-');
  put(join(dir, 'src/a.ts'), 'export function alpha() {\n  return 1;\n}\n');
  put(join(dir, 'notes.md'), 'text\n');
  const first = repoIndex(dir, []);
  assert.ok(first['src/a.ts']);
  assert.deepEqual(first['src/a.ts']?.defs.map(([n]) => n), ['alpha']);
  assert.equal(repoIndex(dir, [])['src/a.ts']?.m, first['src/a.ts']?.m);
  put(join(dir, 'src/a.ts'), 'export function beta() {\n  return 22;\n}\n');
  assert.deepEqual(repoIndex(dir, [])['src/a.ts']?.defs.map(([n]) => n), ['beta']);
  assert.deepEqual(repoIndex(scratchDir('repoidx-empty-'), []), {}, 'a planted empty project has an empty index');
});
