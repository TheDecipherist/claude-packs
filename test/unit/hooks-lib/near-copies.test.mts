// near-copies.mts: a stretch that matches in order with lines changed is found, a planted non-copy is not, and the ids stay sha1 (ten digits).
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { definesOf, fingerprint, nearCopy } from '../../../packs/base/hooks/lib/near-copies.mts';
import { statementsOf } from '../../../packs/base/hooks/lib/code-shapes.mts';
import { languageOf } from '../../../packs/base/hooks/lib/languages.mts';
import type { FileStatements } from '../../../packs/base/hooks/lib/near-copies.mts';

// Statements of 8+ tokens, each of a distinct shape (a different call chain per index).
// Names and numbers are stripped from a shape, so the statements differ in their structure: the count of arguments.
const stmt = (i: number, name: string): string => `${name}.run(${Array.from({ length: i + 8 }, (_, k) => `a${k}`).join(', ')});`;
const body = (n: number, name: string, skip = -1): string => Array.from({ length: n }, (_, i) => (i === skip ? `${name}.other[1][2][3][4][5][6](7, 8);` : stmt(i, name))).join('\n');

test('a fingerprint hash is the first ten hex digits of the sha1 of the statement shape', () => {
  const fp = fingerprint(body(3, 'q'), '.js');
  assert.equal(fp.length, 3);
  for (const [hash] of fp) assert.match(hash, /^[0-9a-f]{10}$/);
  const first = fp[0];
  assert.ok(first);
  const lang = languageOf('.js');
  assert.ok(lang);
  const shape = statementsOf(body(3, 'q'), lang)[0]?.shape ?? '';
  assert.equal(first[0], createHash('sha1').update(shape).digest('hex').slice(0, 10));
});

test('a copy with names changed and one line changed is found, with where it sits', () => {
  const theirs: FileStatements = { file: 'old.js', st: fingerprint(body(12, 'one'), '.js') };
  const added = fingerprint(body(12, 'two', 5), '.js');
  const found = nearCopy(added, [theirs]);
  assert.ok(found);
  assert.equal(found.file, 'old.js');
  assert.equal(found.line, 1);
  assert.ok(found.matched >= 8 && found.matched <= 12, String(found.matched));
});

test('an exact copy matches every statement', () => {
  const st = fingerprint(body(10, 'one'), '.js');
  const found = nearCopy(st, [{ file: 'a.js', st }]);
  assert.equal(found?.matched, 10);
  assert.equal(found?.of, 10);
});

test('a planted non-copy and a short write are not found', () => {
  const theirs: FileStatements = { file: 'old.js', st: fingerprint(body(12, 'one'), '.js') };
  const other = fingerprint(Array.from({ length: 12 }, (_, i) => `z${i} = ${Array.from({ length: i + 8 }, (_, k) => `q${k}`).join(' + ')};`).join('\n'), '.js');
  assert.equal(nearCopy(other, [theirs]), null);
  assert.equal(nearCopy(fingerprint(body(5, 'two'), '.js'), [theirs]), null);
});

test('definesOf names the functions of a file and their lines; an unknown extension names none', () => {
  assert.deepEqual(definesOf('const a = 1;\nfunction go() {}\nclass Box {}\n', '.js').map(([n]) => n), ['go', 'Box']);
  assert.deepEqual(definesOf('function go() {}', '.nope'), []);
  assert.equal(definesOf('\n\nfunction go() {}\n', '.js')[0]?.[1], 3);
});
