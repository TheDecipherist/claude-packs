// lib/shape-cli.mts: the empty manifest, the doctor problem, and the scan of a repo.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { ensureShape, scanRepo, shapeCommand, shapeProblems } from '../../../lib/shape-cli.mts';

test('ensureShape writes design/shape.json once and leaves an existing one alone', () => {
  const dir = scratchDir('shape-ensure-');
  assert.equal(ensureShape(dir), true);
  const first = readText(join(dir, 'design/shape.json'));
  assert.deepEqual(Object.keys(JSON.parse(first ?? '{}')), ['concepts', 'exclude']);
  put(join(dir, 'design/shape.json'), '{"concepts":{},"exclude":["x"]}\n');
  assert.equal(ensureShape(dir), false);
  assert.match(readText(join(dir, 'design/shape.json')) ?? '', /"x"/);
});

test('a project with no shape.json has no problem unless it is a synth', () => {
  const dir = scratchDir('shape-problem-');
  assert.deepEqual(shapeProblems(dir, ['base']), []);
  assert.match(shapeProblems(dir, ['audio-core'])[0] ?? '', /no design\/shape\.json/);
});

test('scanRepo finds a bare instance of a many concept, and skips an excluded file (a planted literal)', () => {
  const dir = scratchDir('shape-scan-');
  put(join(dir, 'design/shape.json'), JSON.stringify({ concepts: { slot: { shape: 'many', count: 4, generator: 'makeSlot', selectors: ['slotAt'] } }, exclude: ['skip/**'] }));
  put(join(dir, 'src/a.ts'), 'const gain = slot2Gain;\n');
  put(join(dir, 'skip/b.ts'), 'const gain = slot2Gain;\n');
  const files = scanRepo(dir).map((f) => f.file);
  assert.deepEqual([...new Set(files)], ['src/a.ts']);
  const lines: string[] = [];
  assert.equal(shapeCommand('scan', dir, (l) => lines.push(l), dir), 1);
  assert.match(lines.at(-1) ?? '', /finding\(s\) in \.: each is an example/);
  assert.throws(() => shapeCommand('other', dir), /shape scan/);
});
