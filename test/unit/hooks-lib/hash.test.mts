// hash.mts: the one short hash (W2.5); the ids it makes are the ones the kit wrote before (sha1). sha256 and tmpKeyed: W10 review, finding 6.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256, shortHash, tmpKeyed } from '../../../packs/base/hooks/lib/hash.mts';

test('the first n hex digits of sha1, the whole 40 by default, as the copies made them', () => {
  const full = createHash('sha1').update('a|b').digest('hex');
  assert.equal(shortHash('a|b'), full);
  assert.equal(shortHash('a|b', 8), full.slice(0, 8));
  assert.equal(shortHash('', 12).length, 12);
});

test('sha256: the digest of text or bytes, whole by default, cut when a length is given', () => {
  const full = createHash('sha256').update('a|b').digest('hex');
  assert.equal(sha256('a|b'), full);
  assert.equal(sha256(Buffer.from('a|b')), full);
  assert.equal(sha256('a|b', 16), full.slice(0, 16));
});

test('tmpKeyed: the temp folder, the prefix, 12 digits of the key\'s sha256 and the suffix; one key, one path', () => {
  const key = '/some/project';
  assert.equal(tmpKeyed('claude-packs-x-', key, '.json'), join(tmpdir(), `claude-packs-x-${createHash('sha256').update(key).digest('hex').slice(0, 12)}.json`));
  assert.equal(tmpKeyed('p-', key), tmpKeyed('p-', key));
  assert.notEqual(tmpKeyed('p-', key), tmpKeyed('p-', '/other'));
});
