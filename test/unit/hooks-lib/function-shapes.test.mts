// function-shapes.mts: every named function in a text, with its lines, its statements and its parameters (0.25.0).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { functionsOf } from '../../../packs/base/hooks/lib/function-shapes.mts';

test('a braced language gives each function its name, 1-based lines, parameters and statements', () => {
  const text = ['function add(a, b) {', '  const c = a + b;', '  return c;', '}', '', 'int mul(int x, int y, int z) {', '  return x * y * z;', '}'].join('\n');
  const add = functionsOf(text, '.js').find((f) => f.name === 'add');
  assert.ok(add);
  assert.deepEqual([add.line, add.end, add.params], [1, 4, 2]);
  assert.ok(add.statements >= 2);
  const mul = functionsOf(text, '.c').find((f) => f.name === 'mul');
  assert.ok(mul);
  assert.deepEqual([mul.line, mul.end, mul.params], [6, 8, 3]);
});

test('control blocks and calls are not functions, and a default argument\'s comma is not a parameter', () => {
  const text = 'function f(a = g(1, 2), b) {\n  if (a) {\n    x();\n  }\n  for (;;) {\n  }\n}\n';
  assert.deepEqual(functionsOf(text, '.js').map((f) => f.name), ['f']);
  assert.equal(functionsOf(text, '.js')[0]?.params, 2);
});

test('an indentation language ends a function where the indent falls, and self is not a parameter', () => {
  const text = ['class A:', '    def m(self, a, b):', '        x = 1', '        return x', '', 'def top():', '    pass'].join('\n');
  const found = functionsOf(text, '.py');
  const m = found.find((f) => f.name === 'm');
  assert.ok(m);
  assert.deepEqual([m.line, m.end, m.params], [2, 4, 2]);
  assert.equal(found.find((f) => f.name === 'top')?.params, 0);
});

test('an extension no row reads gives nothing, and an empty text gives nothing: planted wrong input', () => {
  assert.deepEqual(functionsOf('function f() {}', '.md'), []);
  assert.deepEqual(functionsOf('', '.js'), []);
  assert.deepEqual(functionsOf('{ { } ', '.c'), []);
});

test('a block-bodied arrow function is a function, with its parameters (KWB-186)', () => {
  const text = 'const f = (x, y) => {\n  const z = x + y;\n  return z;\n};\nconst g = async (a: number): Promise<number> => {\n  return a;\n};\n';
  const found = functionsOf(text, '.ts');
  assert.deepEqual(found.map((f) => [f.name, f.params]), [['f', 2], ['g', 1]]);
  assert.deepEqual([found[0]?.line, found[0]?.end], [1, 4]);
});
