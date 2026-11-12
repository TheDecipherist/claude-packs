// glob.mts: the dependency-free glob matcher (**, *, ?, {a,b}) and the one regexp escape.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allWithModuleForms, escapeRegExp, globToRegExp, matchesAny, withModuleForms } from '../../../packs/base/hooks/lib/glob.mts';

test('a glob that names .ts names .mts and .cts too, in a suffix or a brace; .tsx and other globs are left as they are (KWB-198)', () => {
  assert.deepEqual(withModuleForms('**/*.ts'), ['**/*.ts', '**/*.mts', '**/*.cts']);
  assert.deepEqual(withModuleForms('**/*.test.ts'), ['**/*.test.ts', '**/*.test.mts', '**/*.test.cts']);
  assert.deepEqual(withModuleForms('src/**/*.{js,mjs,cjs,jsx,ts,tsx}'), ['src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}']);
  assert.deepEqual(withModuleForms('**/*.{ts,mts}'), ['**/*.{ts,mts,cts}']);
  for (const same of ['**/*.tsx', '**/*.js', '**/*.{js,mjs}', 'src/**', '**/tsconfig*.json']) assert.deepEqual(withModuleForms(same), [same]);
  assert.deepEqual(allWithModuleForms(['**/a.ts', '**/a.mts']), ['**/a.ts', '**/a.mts', '**/a.cts']);
  assert.equal(matchesAny('lib/x.cts', withModuleForms('lib/**/*.ts')), true);
});

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
