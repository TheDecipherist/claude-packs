// shape.mts and its parts (shape-model, shape-lines, shape-hits, shape-lists): the manifest reads and validates, a literal
// instance is found by number, role, array index and hand list, an example line excuses it, and a bad manifest is handled.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { addedFindings, classify, findInstanceLiterals, isExampleLine, normaliseShape, quoteRow, readShape, validateShape } from '../../../packs/base/hooks/lib/shape.mts';
import { escapeRegExp } from '../../../packs/base/hooks/lib/glob.mts';

const manifest = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, f)', selectors: { activeSlot: 'the one playing' }, constants: { kHome: { instance: 0, reason: 'home' } } } }, exclude: [] };
const shape = normaliseShape(manifest);
const hits = (text: string): string[] => findInstanceLiterals(text, 'a.cpp', shape).map((f) => f.instance);

test('a literal instance is found by number, ordinal, index and compare', () => {
  assert.deepEqual(hits('play(slot 2);'), ['2']);
  assert.deepEqual(hits('the second slot'), ['2']);
  assert.deepEqual(hits('x = slots[1];'), ['1']);
  assert.deepEqual(hits('if (slotIx == 3) go();'), ['3']);
  assert.deepEqual(hits('for (int i = 0; i < 4; i++) draw(i);'), []);
});

test('an example line, a selector and a declared constant excuse a literal', () => {
  assert.equal(isExampleLine('// seen in: slot 2'), true);
  assert.deepEqual(hits('// example: slot 2'), []);
  assert.deepEqual(hits('activeSlot(slot 2)'), []);
  assert.equal(classify('use kHome', 'slot', shape), 'constant');
});

test('a hand-listed set, one line per instance, is one finding', () => {
  const found = findInstanceLiterals('(slots); x 0; x 1; x 2; x 3', 'a.cpp', shape);
  assert.ok(found.some((f) => f.instance === 'each'));
});

test('a manifest is read from a project and validated; a bad one is handled, never thrown', () => {
  const root = scratchDir('shape-unit');
  assert.equal(readShape(root), null);
  mkdirSync(join(root, 'design'));
  writeFileSync(join(root, 'design/shape.json'), '{ nope');
  assert.match(readShape(root)?.error ?? '', /does not parse/);
  writeFileSync(join(root, 'design/shape.json'), JSON.stringify({ concepts: { slot: { shape: 'many' }, bad: { shape: 'two' } }, exclude: [] }));
  const problems = validateShape(readShape(root));
  assert.equal(problems.length, 2);
  assert.match(problems.join('\n'), /needs its generator/);
  assert.deepEqual(validateShape(null), ['no design/shape.json']);
});

test('addedFindings keeps what an edit adds, and quoteRow names the row', () => {
  const find = (t: string) => findInstanceLiterals(t, 'a.cpp', shape);
  assert.equal(addedFindings('play(slot 2);', 'play(slot 2);\nplay(slot 2);', find).length, 1);
  assert.match(quoteRow('slot', shape), /"slot": \{/);
  assert.match(quoteRow('nope', shape), /has no row/);
});

test('escapeRegExp makes text a RegExp matches literally', () => {
  assert.equal(new RegExp(escapeRegExp('a.b*(c)')).test('a.b*(c)'), true);
  assert.equal(new RegExp(escapeRegExp('a.b')).test('axb'), false);
});
