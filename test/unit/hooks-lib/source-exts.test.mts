// source-exts.mts: one table of source extensions per language, and which file a build emitted (KWB-170, W1.6).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { emittedFrom, extPattern, extsOf } from '../../../packs/base/hooks/lib/source-exts.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { codeFiles } from '../../../packs/base/hooks/lib/elements.mjs';

test('TypeScript\'s module extensions are source wherever .ts is (W1.6)', () => {
  const ts = extsOf('ts');
  for (const ext of ['.ts', '.mts', '.cts', '.tsx']) assert.ok(ts.has(ext), ext);
  assert.ok(extPattern('js', 'ts').test('packs/base/hooks/lib/json.mts'));
  assert.ok(extPattern('js', 'ts').test('A.CTS'), 'any case');
  assert.equal(extPattern('python').test('a.mts'), false);
});

test('a .mjs beside its .mts is emitted; a hand-written .mjs is not (KWB-170)', () => {
  const dir = scratchDir('source-exts-');
  put(join(dir, 'a.mts'), 'export const a = 1;\n');
  put(join(dir, 'a.mjs'), 'export const a = 1;\n');
  put(join(dir, 'b.mjs'), 'export const b = 2;\n');
  put(join(dir, 'c.ts'), 'export const c = 3;\n');
  put(join(dir, 'c.js'), 'export const c = 3;\n');
  assert.equal(emittedFrom(join(dir, 'a.mjs')), join(dir, 'a.mts'));
  assert.equal(emittedFrom(join(dir, 'c.js')), join(dir, 'c.ts'));
  assert.equal(emittedFrom(join(dir, 'b.mjs')), null);
  assert.equal(emittedFrom(join(dir, 'a.mts')), null, 'a source is never emitted');
});

test('the repetition readers list a source and never its emitted twin (KWB-170)', () => {
  const dir = scratchDir('source-exts-');
  put(join(dir, 'src/a.mts'), 'export const a = 1;\n');
  put(join(dir, 'src/a.mjs'), 'export const a = 1;\n');
  put(join(dir, 'src/b.mjs'), 'export const b = 2;\n');
  assert.deepEqual(codeFiles(dir, [], extsOf('js', 'ts')).sort(), ['src/a.mts', 'src/b.mjs']);
});
