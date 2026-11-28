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
  // KWB-265: a fixed-capacity queue of records is a capacity, not instances: its count is named k...Max / ...Capacity / ...Depth, or the
  // array is a queue, ring, fifo or pending list. A count named for what it counts (kMaxVoices) is still instances.
  assert.deepEqual(findUnknownTypes('struct Pending { int word; };\nstd::array<Pending, kPendingMax> pending {};\n', 'a.cpp', shape), []);
  assert.deepEqual(findUnknownTypes('struct Job { int at; };\nJob jobs[kQueueCapacity];\n', 'a.cpp', shape), []);
  assert.deepEqual(findUnknownTypes('struct Job { int at; };\nstd::array<Job, kJobs> ring {};\n', 'a.cpp', shape), []);
  assert.equal(findUnknownTypes('struct Voice { int gain; };\nstd::array<Voice, kMaxVoices> voices {};\n', 'a.cpp', shape).length, 1);
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

// KWB-next (2026-11-21): the definitions an edit to prose adds are found on its window, and confirmed on the whole old text only when the
// window holds one: a name defined elsewhere in the document is not new
test('addedDefs on a window: a new name is found, a name defined far away is not new, and the whole is read only to confirm one', () => {
  const lines = Array.from({ length: 2000 }, (_, i) => `- row ${i} of the notes, nothing defined here.`);
  lines[10] = 'def alpha';
  const before = `${lines.join('\n')}\n`;
  const read: number[] = [];
  const find = (t: string): { name: string }[] => {
    read.push(t.length);
    return [...t.matchAll(/^def (\w+)$/gm)].map((m) => ({ name: m[1] ?? '' }));
  };
  const at = (n: number, text: string): string => `${lines.map((l, i) => (i === n ? text : l)).join('\n')}\n`;
  assert.deepEqual(addedDefs(before, at(1500, 'def beta'), find, { window: true }).map((d) => d.name), ['beta']);
  assert.deepEqual(addedDefs(before, at(1500, 'def alpha'), find, { window: true }), [], 'alpha is defined at row 10 already');
  read.length = 0;
  assert.deepEqual(addedDefs(before, at(1500, '- an edit that defines nothing.'), find, { window: true }), []);
  assert.ok(Math.max(...read) < before.length / 10, `with no new name the finder read ${Math.max(...read)} of ${before.length}`);
});
