// lib/repeats.mts: what a project repeats, for `scan`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nearCopies, remadeNames, repeatLine, repeatedShapes } from '../../../lib/repeats.mts';
import type { Repeat } from '../../../lib/repeats.mts';

const BODY = Array.from({ length: 14 }, (_, i) => `  total += values[${i}] * weights[${i}] + offsets[${i}];\n`).join('');
const fn = (name: string): string => `export function ${name}(values, weights, offsets) {\n  let total = 0;\n${BODY}  return total;\n}\n`;
// ten statements of ten different shapes, so a near copy has something to match in order
const STEPS = ['total += values[i] * weights[i] + offsets[i];', 'total -= values[i] / weights[i] - offsets[i];', 'total = total * values[i] + weights[i] * offsets[i];',
  'if (total > values[i] && weights[i] < offsets[i]) total = 0;', 'while (total < values[i] || offsets[i] > weights[i]) total += 1;',
  'total = values[i] ? weights[i] : offsets[i] + total;', 'total = Math.max(values[i], weights[i], offsets[i], total);', 'total = [values[i], weights[i], offsets[i]].length + total;',
  'total = (values[i] + weights[i]) * (offsets[i] - total);', 'total = values[i] % weights[i] + offsets[i] % total;'];
const steps = (name: string): string => `export function ${name}(values, weights, offsets) {\n  let total = 0;\n${STEPS.map((l) => `  ${l}\n`).join('')}  return total;\n}\n`;

test('repeatLine says how many copies, where (four at most), and what to make of it', () => {
  const r: Repeat = { kind: 'run', what: 'a loop', copies: 5, at: ['a:1', 'b:2', 'c:3', 'd:4', 'e:5'], template: 'a function', parameters: ['`x`'] };
  assert.equal(repeatLine(r), "  - 5x a loop: a:1, b:2, c:3, d:4, .... Make it a function (differs in: 'x')");
  assert.equal(repeatLine({ ...r, copies: 2, at: ['a:1', 'b:2'], parameters: [] }), '  - 2x a loop: a:1, b:2. Make it a function');
});

test('a statement run written in two files is one repeat, and the same text in a test file is left out', () => {
  const texts = [['src/a.mjs', fn('one')], ['src/b.mjs', fn('two')]] as const;
  const found = repeatedShapes(texts);
  assert.ok(found.length >= 1, 'the planted copy is found');
  assert.ok(found.every((r) => r.at.some((a) => a.startsWith('src/a.mjs')) && r.at.some((a) => a.startsWith('src/b.mjs'))));
  assert.deepEqual(repeatedShapes([['src/a.mjs', fn('one')], ['test/b.test.mjs', fn('two')]]), []);
});

test('two files that hold most of one another are one near copy, reported once; unrelated files are none', () => {
  const found = nearCopies([['a.mjs', steps('one')], ['b.mjs', steps('two')], ['c.mjs', 'export const x = 1;\n']]);
  assert.equal(found.length, 1);
  assert.deepEqual([found[0]?.file, found[0]?.other].sort(), ['a.mjs', 'b.mjs']);
});

test('a compound name defined in two files is a helper made again; a plain name, or one file, is not', () => {
  const def = (name: string): string => `export function ${name}() {\n  return 1;\n}\n`;
  const made = remadeNames([['a.mjs', def('readTheThing')], ['b.mjs', def('readTheThing')], ['c.mjs', def('plain')], ['d.mjs', def('plain')]]);
  assert.deepEqual(made.map((m) => [m.name, m.at]), [['readTheThing', ['a.mjs:1', 'b.mjs:1']]]);
  assert.deepEqual(remadeNames([['a.mjs', def('readTheThing')]]), []);
});
