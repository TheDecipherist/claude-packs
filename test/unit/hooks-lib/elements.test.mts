// elements.mts: markup and code read into shapes. A copy has one shape, a changed copy names its parameters, a non-copy has another.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { CODE, MARKUP, TEMPLATE, codeFiles, copiesNeeded, shapesOf, skippedBy } from '../../../packs/base/hooks/lib/elements.mts';
import { parametersOf } from '../../../packs/base/hooks/lib/code-shapes.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const knob = (label: string, id: string): string => `<div class="knob" data-id="${id}"><span class="lbl">${label}</span><input type="range" min="0" max="1"></div>`;
const run = (a: string, b: string): string => `function f() {
  const ${a} = load(1, 2, 3);
  ${a}.go(2, 4);
  save(${a}, 3, [1, 2]);
  ${b}.stop(4, 5, 6);
  report(${b}, ${a}, 7);
  ${a}.then(${b}.next(1, 2), 3);
  const z = ${a}.get(${b}, 8, 9, 10);
  log(z, ${a}, ${b}, 11, 12);
  return finish(z, ${b}, ${a}, 13);
}
`;

test('two controls that differ only in names and text have one markup shape', () => {
  const a = shapesOf(knob('Cutoff', 'c'), '.html');
  const b = shapesOf(knob('Drive', 'd'), '.html');
  assert.equal(a.length, 1);
  assert.equal(a[0]?.kind, 'markup');
  assert.equal(a[0]?.id, b[0]?.id);
  assert.equal(a[0]?.what, '<div>');
});

test('a different element, a capitalised component and a bare li are not that shape', () => {
  const other = shapesOf('<section class="x"><h2>t</h2><p>t</p><button disabled>go</button></section>', '.html');
  assert.notEqual(other[0]?.id, shapesOf(knob('a', 'b'), '.html')[0]?.id);
  assert.deepEqual(shapesOf('<Knob label="a" id="b" min="0" />', '.html'), []);
  assert.deepEqual(shapesOf('<ul><li>a</li></ul>', '.html'), []);
});

test('markup is read only where the extension is markup; code copies share a run shape and name their parameters', () => {
  assert.equal(MARKUP.has('.html'), true);
  assert.equal(MARKUP.has('.py'), false);
  const a = shapesOf(run('alpha', 'beta'), '.js').find((s) => s.kind === 'run');
  const b = shapesOf(run('gamma', 'delta'), '.js').find((s) => s.kind === 'run');
  assert.ok(a && b);
  assert.equal(a.id, b.id);
  const params = parametersOf(a.id, run('alpha', 'beta'), run('gamma', 'delta'), '.js');
  assert.ok(params.includes('alpha / gamma') && params.includes('beta / delta'), params.join('|'));
  assert.notEqual(shapesOf('function g() {\n  stop(1);\n}\n', '.js').find((s) => s.kind === 'run')?.id, a.id);
});

test('copiesNeeded: rows alone, a short setup needs a third, the rest two', () => {
  assert.equal(copiesNeeded({ kind: 'rows', nodes: 6 }), 1);
  assert.equal(copiesNeeded({ kind: 'setup', nodes: 2 }), 3);
  assert.equal(copiesNeeded({ kind: 'setup', nodes: 3 }, true), 3);
  assert.equal(copiesNeeded({ kind: 'setup', nodes: 3 }), 2);
  assert.equal(copiesNeeded({ kind: 'run', nodes: 9 }), 2);
  assert.deepEqual(Object.keys(TEMPLATE).sort(), ['markup', 'rows', 'run', 'setup']);
});

test('skippedBy lists protected globs, templates.exclude and copy folders; an odd guard is ignored', () => {
  assert.deepEqual(skippedBy({ protected: ['a/**'], guards: { templates: { exclude: ['b/**', 3] } }, folders: { x: { path: 'x', kind: 'copy' }, y: { path: 'y' } } }), ['a/**', 'b/**', 'x/**']);
  assert.deepEqual(skippedBy({ guards: { templates: 'no' } }), []);
  assert.deepEqual(skippedBy({}), []);
});

test('codeFiles walks code, skips SKIP folders, skip globs, an emitted twin and big files', () => {
  const dir = scratchDir('elements-');
  for (const f of ['a.js', 'sub/b.ts', 'node_modules/c.js', 'vendor/d.js', 'skipme/e.js', 'x.mts', 'x.mjs', 'notes.md']) put(join(dir, f), 'export const a = 1;\n');
  put(join(dir, 'big.js'), 'x'.repeat(400_001));
  assert.equal(CODE.has('.mts'), true);
  assert.deepEqual(codeFiles(dir, ['skipme/**']).sort(), ['a.js', 'sub/b.ts', 'x.mts']);
});
