// shape-prose.mts: what in a line is English, arithmetic or a name, and so names no instance.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { blankMessages, blankPaths, declaredAmount, isFirstMatch, isKnownName, isLibraryCall, isLongerName, isSourceRole, isSum } from '../../../packs/base/hooks/lib/shape-prose.mts';
import type { ProseShape } from '../../../packs/base/hooks/lib/shape-prose.mts';

const shape: ProseShape = { concepts: { slot: { name: 'slot', selectors: ['editKnob'], constants: [] } }, values: new Set(['MidiMessage']) };
const match = (re: RegExp, text: string): RegExpMatchArray => {
  const m = text.match(re);
  if (!m) throw new Error(`no match for ${re.source}`);
  return m;
};

test('a sentence in a double-quoted string is blanked to the same length in code; a short key, a document and a path are handled', () => {
  const line = 'log("use slot 2 now"); key("slot 2");';
  const out = blankMessages(line, 'a.cpp');
  assert.equal(out.length, line.length);
  assert.match(out, /^log\( +\); key\("slot 2"\);$/);
  assert.equal(blankMessages(line, 'a.md'), line);
  assert.equal(blankMessages(line, null), line);
  const paths = blankPaths('see docs/screens/om-112-osc1.md and notes.md here');
  assert.equal(paths.length, 'see docs/screens/om-112-osc1.md and notes.md here'.length);
  assert.equal(paths.trim().replace(/\s+/g, ' '), 'see and here');
});

test('"the first X with" and a quoted "first X" are not instances; a bare "first slot" stays one', () => {
  const first = (text: string): boolean => isFirstMatch(text, match(/first slot/i, text));
  assert.equal(first('the first slot with a name'), true);
  assert.equal(first('each bank\'s first slot'), true);
  assert.equal(first('"first slot"'), true);
  assert.equal(first('play first slot'), false);
  assert.equal(isFirstMatch('second slot', match(/second slot/, 'second slot')), false);
});

test('a comment quoting a source role is skipped, an ordinary line is not', () => {
  const text = '// [MAN] Edit knob 1 selects the thing';
  assert.equal(isSourceRole(text, match(/knob 1/, text)), true);
  const code = 'x = [MAN] knob 1 selects';
  assert.equal(isSourceRole(code, match(/knob 1/, code)), false, 'not a comment');
});

test('a role word is a known name when the pair is a concept, a selector or a constant; a capitalised follower is a longer name', () => {
  assert.equal(isKnownName('edit', 'Knob', shape), true);
  assert.equal(isKnownName('pad', 'Slot', shape), false);
  assert.equal(isLongerName('MIDI Program Change', 4), true);
  assert.equal(isLongerName('MIDI program', 4), false);
  assert.equal(isSum('x + '), true);
  assert.equal(isSum('x == '), false);
});

test('a call through a library path or a listed value type is not an instance call; a project\'s own is', () => {
  const at = (line: string): number => line.indexOf('program');
  assert.equal(isLibraryCall('juce::MidiMessage::programChange(1)', 'juce::MidiMessage::'.length, shape), true);
  assert.equal(isLibraryCall('MidiMessage::program(1)', at('MidiMessage::program(1)'), shape), true);
  assert.equal(isLibraryCall('Mine::program(1)', at('Mine::program(1)'), shape), false);
  assert.equal(isLibraryCall('program(1)', 0, shape), false);
});

test('a call whose every declaration takes an amount first is no instance; one with no declaration, or another kind, is', () => {
  const root = scratchDir('shape-prose-');
  put(`${root}/a.cpp`, 'void pickProgram(int number);\n');   // no repository here, so only the text being written declares
  const env = { PATH: process.env['PATH'] };
  assert.equal(declaredAmount(root, 'turnProgram', 'void turnProgram(int steps, bool wrap);\nturnProgram(2, true);', env), true);
  assert.equal(declaredAmount(root, 'pickProgram', 'void pickProgram(int number);\npickProgram(2);', env), false);
  assert.equal(declaredAmount(root, 'neverDeclared', 'neverDeclared(2);', env), false);
  assert.equal(declaredAmount(root, 'inText', 'void inText(int delta) {}', env), true, 'a declaration in the text being written counts');
});
