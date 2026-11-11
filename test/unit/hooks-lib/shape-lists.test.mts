// shape-lists.mts: a hand-listed set (one line per instance, or one piece per instance) is one finding for the concept.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handLists } from '../../../packs/base/hooks/lib/shape-lists.mts';
import type { InstanceFinding } from '../../../packs/base/hooks/lib/shape-lists.mts';
import { normaliseShape } from '../../../packs/base/hooks/lib/shape-model.mts';
import type { ShapeConceptData } from '../../../packs/base/hooks/lib/shape-model.mts';

const concept = (row: Record<string, unknown>): ShapeConceptData => {
  const c = normaliseShape({ concepts: { slot: row } }).concepts['slot'];
  assert.ok(c);
  return c;
};
const MANY = { shape: 'many', count: 3, generator: 'slotId(i)' };
const find = (lines: string[], c: ShapeConceptData, seen: Set<string> = new Set()): InstanceFinding[] => {
  const out: InstanceFinding[] = [];
  handLists(lines, c, out, seen);
  return out;
};

test('one line per instance running 0 to count-1 is a hand-listed set, reported at its first line', () => {
  const found = find(['int a;', 'slot 0 on', 'slot 1 on', 'slot 2 on'], concept(MANY));
  assert.equal(found.length, 1);
  assert.equal(found[0]?.line, 2);
  assert.equal(found[0]?.instance, 'each');
  assert.match(found[0]?.why ?? '', /one line per slot/);
});

test('one piece per instance on one line is a finding too; an example line, a short run or a gap is not', () => {
  assert.match(find(['slot 1; slot 2; slot 3'], concept(MANY)).map((f) => f.why).join(), /one piece per slot/);
  assert.deepEqual(find(['// example: slot 0 on', 'slot 1 on', 'slot 2 on'], concept(MANY)), []);
  assert.deepEqual(find(['slot 0 on', 'slot 1 on'], concept(MANY)), [], 'two of three');
  assert.deepEqual(find(['slot 0 on', 'slot 2 on', 'slot 3 on'], concept(MANY)), []);
});

test('a concept that is one, has no count or a count under two, is never a list; a line already reported is skipped', () => {
  const run = ['slot 0 on', 'slot 1 on', 'slot 2 on'];
  assert.deepEqual(find(run, concept({ shape: 'one' })), []);
  assert.deepEqual(find(run, concept({ shape: 'many', generator: 'g()' })), []);
  assert.deepEqual(find(run, concept({ shape: 'many', generator: 'g()', count: 1 })), []);
  assert.deepEqual(find(run, concept(MANY), new Set(['0|slot'])), []);
});
