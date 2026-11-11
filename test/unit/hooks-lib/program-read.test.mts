// program-read.mts: the small reader of an inline program (never runs it): literals numbered, statements split, simple expressions evaluated.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { closeOf, evaluate, scan, splitArgs, statements } from '../../../packs/base/hooks/lib/program-read.mts';
import type { EvalContext, Value } from '../../../packs/base/hooks/lib/program-read.mts';

test('scan numbers each literal, blanks comments, and marks an interpolating one as unknown', () => {
  const s = scan("x = 'a.ts'  # 'hidden'\ny = f'{x}.md'", 'python');
  assert.equal(s.lits[0], 'a.ts');
  assert.ok(!s.code.includes('hidden'), 'a comment is blanked');
  assert.ok(s.lits.includes(null), 'an f-string interpolates');
  assert.ok(!s.code.includes('a.ts'), 'the literal is a number in the code');
});

test('statements split at newlines and semicolons outside brackets, and an empty program has none', () => {
  assert.deepEqual(statements('a = 1; b = f(2; 3)\nc'), ['a = 1', 'b = f(2; 3)', 'c']);
  assert.deepEqual(statements(' \n ;; '), []);
});

test('splitArgs splits at the top level only; closeOf finds the matching bracket, or -1 for a planted unclosed one', () => {
  assert.deepEqual(splitArgs('a, f(b, c), [d, e]'), ['a', 'f(b, c)', '[d, e]']);
  assert.deepEqual(splitArgs('  '), []);
  assert.equal(closeOf('f(a(b)c)d', 1), 7);
  assert.equal(closeOf('f(a(b', 1), -1);
});

test('evaluate reads a literal and a joined path, and gives null for what it cannot know', () => {
  const s = scan("'dir' + '/x.txt'", 'python');
  const ctx: EvalContext = { env: new Map<string, Value | null>(), lits: s.lits, lang: 'python', at: (p) => `/w/${p}`, readText: () => null };
  assert.deepEqual(evaluate(s.code, ctx), { t: 'str', v: 'dir/x.txt' });
  assert.equal(evaluate('unknown_call()', ctx), null);
  const withVar: EvalContext = { ...ctx, env: new Map<string, Value | null>([['p', { t: 'str', v: 'a.md' }]]) };
  assert.deepEqual(evaluate('p', withVar), { t: 'str', v: 'a.md' });
});
