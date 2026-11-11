// lib/packs.mjs: what the installer copies (W2.3, d-2): never a TypeScript source, a source map or the build's memory.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planFiles } from '../../../lib/packs.mjs';
import { notInstalled, put, scratchDir, walk } from '../../../packs/base/hooks/lib/files.mts';

const KIT = fileURLToPath(new URL('../../../', import.meta.url));

test('base holds .mts sources, and its install plan copies none of them, only their emitted .mjs (W2.3)', () => {
  const sources = walk(join(KIT, 'packs/base'), () => false).filter((f) => f.endsWith('.mts'));
  assert.ok(sources.length > 0, 'base has TypeScript sources: the plant is the real tree');
  const planned = planFiles('base', {}).map((p) => p.rel ?? '');
  assert.deepEqual(planned.filter((rel) => /\.(?:mts|cts|map|tsbuildinfo)$/.test(rel)), []);
  for (const src of sources) {
    const emitted = src.replace(/\.mts$/, '.mjs');
    if (existsSync(emitted) && !src.endsWith('.d.mts')) assert.ok(planned.some((rel) => emitted.endsWith(rel.replace(/^\.claude\//, ''))), emitted);
  }
});

test('the walk the installer uses skips build-only files and junk; the default walk keeps a .mts', () => {
  const dir = scratchDir('packs-walk-');
  for (const f of ['a.mjs', 'a.mts', 'types.d.mts', 'a.mjs.map', 'b.tsbuildinfo', '__pycache__/x.pyc', 'c.pyc']) put(join(dir, f), 'x');
  const names = (files: string[]) => files.map((f) => f.slice(dir.length + 1));
  assert.deepEqual(names(walk(dir, notInstalled)), ['a.mjs']);
  assert.deepEqual(names(walk(dir)), ['a.mjs', 'a.mjs.map', 'a.mts', 'b.tsbuildinfo', 'types.d.mts']);
});
