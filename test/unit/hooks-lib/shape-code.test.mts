// shape-code.mts: what the shape law reads in code beyond literal instances: selector definitions no manifest row lists, and
// container types whose concept has no row.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addedDefs, findSelectorDefs, findUnknownTypes } from '../../../packs/base/hooks/lib/shape-code.mts';
import { normaliseShape } from '../../../packs/base/hooks/lib/shape-model.mts';

const shape = normaliseShape({ concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i)', selectors: { pickActiveSlot: 'the one playing' }, constants: { kHomeSlot: { instance: 0, reason: 'home' } } } }, values: ['Cell'] });

test('a function that picks a concept\'s instance and is not listed is a finding; a listed one, the generator and a counter are not', () => {
  const text = 'int pickSlot(int n) { return n; }\nint pickActiveSlot() { return 0; }\nint slotId(int i) { return i; }\nint slotCount() { return 4; }\nint pickerSlot() { return 0; }\n';
  const found = findSelectorDefs(text, 'a.cpp', shape);
  assert.deepEqual(found.map((f) => `${f.line}:${f.name}:${f.kind}`), ['1:pickSlot:selector']);
  assert.match(found[0]?.why ?? '', /call a listed one \(pickActiveSlot\)/);
});

test('definitions are read in C++, JS, Python and Rust forms; other files, a one-concept row and no shape find nothing', () => {
  for (const [file, text] of [['a.js', 'const selectSlot = (n) => n;'], ['a.py', 'def select_slot(n):\n  return n'], ['a.rs', 'pub fn select_slot(n: u8) {}'], ['a.ts', 'function selectSlot(n) {}']] as const) {
    assert.equal(findSelectorDefs(text, file, shape).length, 1, file);
  }
  assert.deepEqual(findSelectorDefs('def select_slot(n): pass', 'a.txt', shape), []);
  assert.deepEqual(findSelectorDefs('int pickSlot(int n) { return n; }', 'a.cpp', null), []);
  assert.deepEqual(findSelectorDefs('int pickLane(int n) { return n; }', 'a.cpp', normaliseShape({ concepts: { lane: { shape: 'one' } } })), []);
  assert.deepEqual(findSelectorDefs('if (pickSlot(n)) { x(); }', 'a.cpp', shape), [], 'a keyword line is a call, not a definition');
});

test('a type with an index member, or made N times by a named count, whose concept has no row, is a finding', () => {
  const withIndex = 'struct Voice {\n  int index = 0;\n};\n';
  const found = findUnknownTypes(withIndex, 'a.cpp', shape);
  assert.deepEqual(found.map((f) => `${f.line}:${f.name}:${f.kind}:${f.concept}`), ['1:Voice:type:null']);
  assert.equal(findUnknownTypes('struct Voice { int gain; };\nVoice voices[kVoices];\n', 'a.cpp', shape).length, 1);
  assert.equal(findUnknownTypes('class Voice:\n  def __init__(self):\n    self.index = 0\n', 'a.py', shape).length, 1);
});

test('a type named for a concept, a listed value type, a table, a literal size or a type in a string is not a finding', () => {
  assert.deepEqual(findUnknownTypes('struct SlotState {\n  int index = 0;\n};\n', 'a.cpp', shape), []);
  assert.deepEqual(findUnknownTypes('struct Cell {\n  int index = 0;\n};\n', 'a.cpp', shape), []);
  assert.deepEqual(findUnknownTypes('struct Voice { int gain; };\nVoice table[kRows] = { {1} };\n', 'a.cpp', shape), []);
  assert.deepEqual(findUnknownTypes('struct Voice { int gain; };\nVoice voices[4];\n', 'a.cpp', shape), []);
  assert.deepEqual(findUnknownTypes('const s = "struct Voice {\\n int index = 0;\\n};";\n', 'a.js', shape), []);
  assert.deepEqual(findUnknownTypes('struct Voice {\n  int index = 0;\n};\n', 'a.txt', shape), []);
  assert.deepEqual(findUnknownTypes('struct Voice {\n  int index = 0;\n};\n', 'a.cpp', null), []);
});

test('addedDefs keeps only the names an edit adds', () => {
  const find = (t: string) => findSelectorDefs(t, 'a.cpp', shape);
  const before = 'int pickSlot(int n) { return n; }\n';
  assert.deepEqual(addedDefs(before, before, find), []);
  assert.deepEqual(addedDefs(before, `${before}int selectSlot(int n) { return n; }\n`, find).map((d) => d.name), ['selectSlot']);
  assert.deepEqual(addedDefs(null, before, find).map((d) => d.name), ['pickSlot']);
});
