// files.mts: the one owner of the file helpers (W2.5).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { childError, ensureDir, isDir, put, readText, scratchDir, walk } from '../../../packs/base/hooks/lib/files.mts';

test('readText: the text, or null for a folder, a missing file or one over 8 MB', () => {
  const dir = scratchDir('files-');
  put(join(dir, 'a/b.txt'), 'hello\n');
  assert.equal(readText(join(dir, 'a/b.txt')), 'hello\n');
  assert.equal(readText(join(dir, 'a')), null);
  assert.equal(readText(join(dir, 'missing')), null);
  put(join(dir, 'big.bin'), Buffer.alloc(8 * 1024 * 1024 + 1));
  assert.equal(readText(join(dir, 'big.bin')), null);
});

test('ensureDir and isDir; scratchDir is a real, empty, new folder', () => {
  const dir = scratchDir('files-');
  assert.equal(ensureDir(join(dir, 'x/y')), join(dir, 'x/y'));
  assert.ok(isDir(join(dir, 'x/y')));
  assert.equal(isDir(join(dir, 'nope')), false);
  assert.deepEqual(walk(scratchDir('files-')), []);
  assert.notEqual(scratchDir('files-'), scratchDir('files-'));
});

test('walk: name order, every depth, junk left out, a skip of the caller\'s', () => {
  const dir = scratchDir('files-');
  for (const f of ['b.mjs', 'a/z.mjs', 'a/y.txt', '.DS_Store', '__pycache__/m.pyc']) put(join(dir, f), 'x');
  assert.deepEqual(walk(dir).map((f) => f.slice(dir.length + 1)), ['a/y.txt', 'a/z.mjs', 'b.mjs']);
  assert.deepEqual(walk(dir, (name) => name === 'a').map((f) => f.slice(dir.length + 1)), ['.DS_Store', '__pycache__/m.pyc', 'b.mjs']);
  assert.deepEqual(walk(join(dir, 'missing')), []);
});

test('childError: the first line of stderr, else the message, else the value', () => {
  assert.equal(childError({ stderr: 'fatal: no repo\nmore', message: 'Command failed' }), 'fatal: no repo');
  assert.equal(childError({ stderr: '', message: 'Command failed: git\nx' }), 'Command failed: git');
  assert.equal(childError(new Error('plain')), 'plain');
  assert.equal(childError('text'), 'text');
  assert.equal(childError(null), 'null');
});
