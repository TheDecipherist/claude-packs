// lib/manifest.mts: the install lock, its hashes and the "modified" test.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { LOCK, hashFile, isModified, readLock, writeLock } from '../../../lib/manifest.mjs';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('no lock reads as an empty one; a written lock reads back and ends with a newline', () => {
  const claude = scratchDir('lock-');
  assert.deepEqual(readLock(claude).files, {});
  writeLock(claude, { kit: '1.0.0', packs: ['base'], files: { 'a.txt': 'h' } });
  assert.equal(readLock(claude).kit, '1.0.0');
  assert.ok((readText(join(claude, LOCK)) ?? '').endsWith('}\n'));
});

test('a lock that is not JSON throws, so an install never writes over what it could not read', () => {
  const claude = scratchDir('lock-bad-');
  put(join(claude, LOCK), '{ nope');
  assert.throws(() => readLock(claude), /not valid JSON/);
});

test('hashFile is the sha256 of the bytes', () => {
  const dir = scratchDir('lock-hash-');
  put(join(dir, 'a'), 'abc');
  assert.equal(hashFile(join(dir, 'a')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('a file is modified only when it exists, is in the lock, and no longer matches', () => {
  const dir = scratchDir('lock-mod-');
  put(join(dir, 'a'), 'abc');
  const lock = { kit: '', packs: [], files: { a: hashFile(join(dir, 'a')), gone: 'x' } };
  assert.equal(isModified(dir, 'a', lock), false);
  assert.equal(isModified(dir, 'gone', lock), false, 'missing is not modified');
  assert.equal(isModified(dir, 'unlisted', lock), false);
  put(join(dir, 'a'), 'changed');
  assert.equal(isModified(dir, 'a', lock), true);
});
