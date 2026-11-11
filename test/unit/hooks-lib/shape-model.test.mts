// shape-model.mts: design/shape.json compiled (words, plurals, patterns, selectors, constants), read from a project, and validated.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { SHAPE_FILE, normaliseShape, parts, readShape, validateShape } from '../../../packs/base/hooks/lib/shape-model.mts';

test('an identifier is split into lower-case parts at case changes, digits and separators', () => {
  assert.deepEqual(parts('kSlotNames'), ['k', 'slot', 'names']);
  assert.deepEqual(parts('slot2Gain'), ['slot', '2', 'gain']);
  assert.deepEqual(parts('HTTPServer_id'), ['http', 'server', 'id']);
  assert.deepEqual(parts('__'), []);
});

test('a row compiles to its words, plural and singular forms, selectors, constants and the generator\'s name', () => {
  const shape = normaliseShape({ concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, f)', arrays: ['gains'], names: ['delay'],
    selectors: { activeSlot: 'the one playing' }, constants: { kHome: { instance: 0, reason: 'home' } } } }, exclude: ['out/**'], values: ['Cell'] });
  const c = shape.concepts['slot'];
  assert.deepEqual(c?.words, ['slot', 'slots']);
  assert.deepEqual([...(c?.plural ?? [])], ['slots']);
  assert.deepEqual(c?.single, ['slot']);
  assert.equal(c?.count, 4);
  assert.equal(c?.generatorName, 'slotId');
  assert.deepEqual([c?.selectors, c?.constants, c?.arrays], [['activeSlot'], ['kHome'], ['gains']]);
  assert.ok(c?.names.has('DELAY'), 'identity names are upper-cased');
  assert.deepEqual(c?.quotes, ['home', 'the one playing']);
  assert.deepEqual(shape.exclude, ['out/**']);
  assert.ok(shape.values?.has('Cell'));
});

test('a pattern that does not compile is kept as a problem, never thrown; garbage fields are read as empty', () => {
  const shape = normaliseShape({ concepts: { slot: { shape: 'many', generator: 'g()', count: 'four', patterns: ['(unclosed', 'ok\\d'], words: 5 } }, exclude: 'nope' });
  const c = shape.concepts['slot'];
  assert.equal(c?.patterns.length, 1);
  assert.equal(c?.badPatterns.length, 1);
  assert.equal(c?.count, null);
  assert.deepEqual(shape.exclude, []);
  assert.deepEqual(normaliseShape(null).concepts, {});
  assert.deepEqual(normaliseShape({ concepts: [1] }).concepts, {}, 'a list is not a table of concepts');
});

test('a manifest is read from a project: none is null, an unparsable one carries its error', () => {
  const root = scratchDir('shape-model-');
  assert.equal(readShape(root), null);
  put(join(root, SHAPE_FILE), '{ nope');
  const broken = readShape(root);
  assert.match(broken?.error ?? '', /does not parse/);
  assert.deepEqual(broken?.concepts, {});
  put(join(root, SHAPE_FILE), '{"concepts":{"lane":{"shape":"one"}},"exclude":[]}');
  assert.equal(readShape(root)?.concepts['lane']?.shape, 'one');
});

test('validateShape names each row that breaks the contract and passes a sound manifest', () => {
  const sound = normaliseShape({ concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i)', constants: { kHome: { instance: 0, reason: 'home' } } } }, exclude: [] });
  assert.deepEqual(validateShape(sound), []);
  const bad = normaliseShape({ concepts: {
    a: { shape: 'two' }, b: { shape: 'many' }, c: { shape: 'one', count: 3 }, d: { shape: 'many', generator: 'g()', count: 0 },
    e: { shape: 'many', generator: 'g()', count: 4, constants: { kX: { instance: 9 }, kY: { reason: 'r' } } }, f: { shape: 'one', patterns: ['('] },
    g: { shape: 'one', names: [''] },
  }, exclude: [], values: [''] });
  const text = validateShape(bad).join('\n');
  for (const want of [/shape must be/, /needs its generator/, /a one concept has no count/, /count must be a whole number/, /constant kX has no reason/, /outside the 4/, /constant kY names no instance/, /pattern does not compile/, /names must be a list/, /"values" must be a list/]) assert.match(text, want);
  assert.deepEqual(validateShape(null), ['no design/shape.json']);
  assert.match(validateShape(normaliseShape({ concepts: [], exclude: {} })).join('\n'), /"concepts" must be an object[\s\S]*"exclude" must be a list/);
});
