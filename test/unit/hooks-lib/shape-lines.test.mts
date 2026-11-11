// shape-lines.mts: what a line or an identifier says about a concept: example lines, selectors, constants, counts, loop aliases.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aliasesOf, classify, conceptOfExpr, conceptOfName, conceptOfType, isCountish, isExampleLine, named } from '../../../packs/base/hooks/lib/shape-lines.mts';
import { normaliseShape } from '../../../packs/base/hooks/lib/shape-model.mts';

const shape = normaliseShape({ concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i)', selectors: { activeSlot: 'playing' }, constants: { kHome: { instance: 0, reason: 'home' } } } }, exclude: [] });

test('an example line opens with seen in or example after any run of comment marks; a long dash row is judged at once', () => {
  assert.equal(isExampleLine('  // seen in: slot 2'), true);
  assert.equal(isExampleLine('| a | example: b |'), true);
  assert.equal(isExampleLine('x // example: y'), false);
  const start = Date.now();
  assert.equal(isExampleLine('-- '.repeat(400) + 'x'), false);
  assert.ok(Date.now() - start < 50);
});

test('classify says example, selector or constant by whole name, and null for a bare line or an unknown concept', () => {
  assert.equal(classify('call activeSlot(2)', 'slot', shape), 'selector');
  assert.equal(classify('use kHome', 'slot', shape), 'constant');
  assert.equal(classify('use kHomeAlso', 'slot', shape), null, 'a name is matched whole');
  assert.equal(classify('play(slot 2)', 'slot', shape), null);
  assert.equal(classify('play(slot 2)', 'nope', shape), null);
  assert.equal(classify('// example: slot 2', 'nope', shape), 'example');
  assert.equal(named('a.b(c)', 'a.b(c)'), true);
});

test('an identifier names the concept whose word is one of its parts; a count word makes a number, not an instance', () => {
  assert.equal(conceptOfName('kSlotNames', shape), 'slot');
  assert.equal(conceptOfType('SlotState', shape), 'slot');
  assert.equal(conceptOfName('slots', shape, { singleOnly: true }), null);
  assert.equal(conceptOfName('voice', shape), null);
  assert.equal(conceptOfName('slot', null), null);
  assert.equal(isCountish('size'), true);
  assert.equal(isCountish('slot'), false);
});

test('an expression names a concept by its last member or the one before an index; counts and plurals do not', () => {
  assert.equal(conceptOfExpr('state.slot', shape, new Map()), 'slot');
  assert.equal(conceptOfExpr('slot.index', shape, new Map()), 'slot');
  assert.equal(conceptOfExpr('slots.size()', shape, new Map()), null);
  assert.equal(conceptOfExpr('numSlot', shape, new Map()), null);
  assert.equal(conceptOfExpr('i', shape, new Map([['i', 'slot']])), 'slot');
  assert.equal(conceptOfExpr('', shape, new Map()), null);
});

test('a loop bounded by a concept\'s count, and a local set from a concept\'s member, stand for that concept', () => {
  const found = aliasesOf('for (int i = 0; i < kSlots; i++) {}\nfor s in range(slots):\nauto cur = state.slot;\nauto n = other;\n', shape);
  assert.equal(found.get('i'), 'slot');
  assert.equal(found.get('s'), 'slot');
  assert.equal(found.get('cur'), 'slot');
  assert.equal(found.has('n'), false);
});
