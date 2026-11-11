// hash.mts: the one short hash (W2.5); the ids it makes are the ones the kit wrote before (sha1).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { shortHash } from '../../../packs/base/hooks/lib/hash.mts';

test('the first n hex digits of sha1, the whole 40 by default, as the copies made them', () => {
  const full = createHash('sha1').update('a|b').digest('hex');
  assert.equal(shortHash('a|b'), full);
  assert.equal(shortHash('a|b', 8), full.slice(0, 8));
  assert.equal(shortHash('', 12).length, 12);
});
