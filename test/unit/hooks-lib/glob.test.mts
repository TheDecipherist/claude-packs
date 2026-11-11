// glob.mts: the dependency-free glob matcher (**, *, ?, {a,b}) and the one regexp escape.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escapeRegExp, globToRegExp, matchesAny } from '../../../packs/base/hooks/lib/glob.mts';

test('* stays inside a folder, ** crosses folders, a leading **/ also matches the root, ? is one character', () => {
  assert.equal(matchesAny('src/a.ts', ['src/*.ts']), true);
  assert.equal(matchesAny('src/deep/a.ts', ['src/*.ts']), false);
  assert.equal(matchesAny('src/deep/er/a.ts', ['src/**']), true);
  assert.equal(matchesAny('a.ts', ['**/a.ts']), true);
  assert.equal(matchesAny('x/y/a.ts', ['**/a.ts']), true);
  assert.equal(matchesAny('ab', ['a?']), true);
  assert.equal(matchesAny('a/', ['a?']), false);
});

test('braces list alternatives, dots are literal, and a path is normalised before it is matched', () => {
  assert.equal(matchesAny('a.ts', ['*.{ts,js}']), true);
  assert.equal(matchesAny('a.md', ['*.{ts,js}']), false);
  assert.equal(matchesAny('axts', ['a.ts']), false);
  assert.equal(matchesAny('.\\src\\a.ts', ['src/a.ts']), true);
  assert.equal(matchesAny('./a.ts', ['a.ts']), true);
  assert.equal(matchesAny('a.ts', []), false);
});

test('a glob compiles once, and escapeRegExp makes text a regexp matches literally', () => {
  assert.equal(globToRegExp('src/**'), globToRegExp('src/**'));
  const wild = 'a.b*(c)[d]+?$^|\\';
  assert.equal(new RegExp(`^${escapeRegExp(wild)}$`).test(wild), true);
  assert.equal(new RegExp(`^${escapeRegExp('a.b')}$`).test('axb'), false, 'a planted look-alike does not match');
});
