// code-shapes.mts and shape-prose.mts: the ids the repetition reader wrote before stay the same (sha1, sixteen digits), a table
// reads as rows, a copy as a run, and the prose tests of the shape law narrow as they did.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { codeShapes, parametersOf, statementsOf } from '../../../packs/base/hooks/lib/code-shapes.mts';
import { languageOf } from '../../../packs/base/hooks/lib/languages.mts';
import { blankMessages, blankPaths, declaredAmount, isFirstMatch, isLibraryCall, isLongerName, isSum } from '../../../packs/base/hooks/lib/shape-prose.mts';

const calls = (names: readonly string[]): string => names.map((n, i) => `add(${n}, ${i});`).join('\n');
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

test('six calls of one function in a row read as rows; five do not', () => {
  assert.deepEqual(codeShapes(calls(['a', 'b', 'c', 'd', 'e', 'f']), '.js').filter((s) => s.kind === 'rows').map((s) => [s.nodes, s.what]), [[6, 'add (...)']]);
  assert.deepEqual(codeShapes(calls(['a', 'b', 'c', 'd', 'e']), '.js').filter((s) => s.kind === 'rows'), []);
});

test('a run id is r: and the first sixteen hex digits of the sha1 of the language and its shapes', () => {
  const lang = languageOf('.js');
  assert.ok(lang);
  const list = statementsOf(run('x', 'y'), lang);
  const shapes = codeShapes(run('x', 'y'), '.js').filter((s) => s.kind === 'run');
  assert.ok(shapes.length > 0);
  const first = shapes[0];
  assert.ok(first && first.at !== undefined);
  const window = list.slice(first.at, first.at + first.nodes);
  const expected = createHash('sha1').update(`${lang.name} ${window.map((s) => s.shape).join(' ')}`).digest('hex').slice(0, 16);
  assert.equal(first.id, `r:${expected}`);
});

test('a copy with other names has the same run id, and parametersOf names what differs', () => {
  const a = codeShapes(run('x', 'y'), '.js').find((s) => s.kind === 'run');
  const b = codeShapes(run('p', 'q'), '.js').find((s) => s.kind === 'run');
  assert.ok(a && b);
  assert.equal(a.id, b.id);
  assert.ok(parametersOf(a.id, run('x', 'y'), run('p', 'q'), '.js').includes('x / p'));
});

test('a planted extension no row reads gives no shapes and no parameters', () => {
  assert.deepEqual(codeShapes('a(1);', '.nope'), []);
  assert.deepEqual(parametersOf('r:0', 'a', 'b', '.nope'), []);
});

test('blankMessages blanks a sentence and keeps a short key; blankPaths blanks a path to the same length', () => {
  assert.equal(blankMessages('say("select a knob now") + key("knob 1")', 'a.js'), `say(${' '.repeat(19)}) + key("knob 1")`);
  assert.equal(blankMessages('"one two three"', 'a.txt'), '"one two three"');
  const line = 'see docs/screens/om-112.md';
  assert.equal(blankPaths(line).length, line.length);
  assert.equal(blankPaths(line).trim(), 'see');
});

test('the narrow prose tests: first-match, sum, longer name, library call', () => {
  const m = 'each program: the first program'.match(/first program/);
  assert.ok(m);
  assert.equal(isFirstMatch('the first program with this name', 'the first program with this name'.match(/first program/) as RegExpMatchArray), true);
  assert.equal(isFirstMatch('first program', 'first program'.match(/first program/) as RegExpMatchArray), false);
  assert.equal(isSum('x + '), true);
  assert.equal(isSum('x == '), false);
  assert.equal(isLongerName('program Change', 7), true);
  assert.equal(isLongerName('program(1)', 7), false);
  const shape = { concepts: {}, values: new Set(['Cell']) };
  assert.equal(isLibraryCall('juce::MidiMessage::programChange(1)', 'juce::MidiMessage::'.length, shape), true);
  assert.equal(isLibraryCall('Cell::at(1)', 'Cell::'.length, shape), true);
  assert.equal(isLibraryCall('mine::at(1)', 'mine::'.length, shape), false);
});

test('declaredAmount: a declaration in the text whose first parameter is an amount; none declared stays an instance', () => {
  const env = {};
  assert.equal(declaredAmount('/no/such/folder', 'turnProgram', 'void turnProgram (int steps, bool x);', env), true);
  assert.equal(declaredAmount('/no/such/folder', 'turnProgram', 'void turnProgram (int index, bool x);', env), false);
  assert.equal(declaredAmount('/no/such/folder', 'turnProgram', 'nothing here', env), false);
});
