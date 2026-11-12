// json.mts isRecord and asRecord: the one plain-object guard (typescript order W10 review, finding 2): an object, never an array or null.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { asRecord, isRecord } from '../../../packs/base/hooks/lib/json.mts';

test('isRecord: an object is one; an array, null, a string, a number and nothing are not', () => {
  assert.equal(isRecord({ a: 1 }), true);
  assert.equal(isRecord({}), true);
  for (const v of [[], [1], null, undefined, 'x', 3, true]) assert.equal(isRecord(v), false);
});

test('asRecord: the object itself, or null', () => {
  const o = { a: 1 };
  assert.equal(asRecord(o), o);
  assert.equal(asRecord([o]), null);
  assert.equal(asRecord(null), null);
});
