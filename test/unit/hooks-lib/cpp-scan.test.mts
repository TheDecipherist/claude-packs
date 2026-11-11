// cpp-scan.mts: comments and strings blanked at the same offsets, audio-thread function bodies found, a line counted.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUDIO_FUNCTIONS, blankCode, findAudioBodies, lineAt } from '../../../packs/base/hooks/lib/cpp-scan.mts';

test('comments and strings go to spaces, offsets and newlines stay, and keepStrings keeps the strings', () => {
  const src = 'int a; // new Foo\nconst char* s = "malloc(1)"; /* lock\n */ int b;';
  const out = blankCode(src);
  assert.equal(out.length, src.length);
  assert.equal(out.split('\n').length, src.split('\n').length);
  assert.ok(!out.includes('Foo') && !out.includes('malloc') && !out.includes('lock'));
  assert.ok(out.includes('int a;') && out.includes('int b;'));
  assert.ok(blankCode(src, true).includes('malloc(1)'));
  assert.ok(!blankCode(src, true).includes('Foo'), 'comments still go');
});

test('a // inside a string is no comment, and an unclosed string or comment does not run past the text', () => {
  assert.ok(blankCode('auto u = "http://x"; int k;').includes('int k;'));
  assert.equal(blankCode('x /* never closed').length, 'x /* never closed'.length);
  assert.equal(blankCode('"open\nint y;').includes('int y;'), true, 'a string ends at its line');
});

test('the audio functions and any "nonblocking" function are found, with their braces; a call or declaration is not', () => {
  assert.ok(AUDIO_FUNCTIONS.has('processBlock'));
  const code = blankCode([
    'void A::processBlock (Buf& b) { work(); }',
    'void helper() { processSample (1); }',
    'void f() nonblocking { x(); }',
    'void g() noexcept(true) nonblocking { y(); }',
    'void processBlock (Buf&);',
    'void other() { if (z.processSample (s)) { } }',
  ].join('\n'));
  const found = findAudioBodies(code);
  assert.deepEqual(found.map((b) => b.name), ['processBlock', 'f', 'g']);
  const first = found[0];
  assert.ok(first);
  assert.equal(code[first.start], '{');
  assert.equal(code[first.end], '}');
  assert.ok(code.slice(first.start, first.end).includes('work()'));
});

test('an unbalanced body is skipped, not thrown on, and lineAt counts newlines before an offset', () => {
  assert.deepEqual(findAudioBodies('void processBlock () { never closed'), []);
  assert.equal(lineAt('a\nb\nc', 0), 1);
  assert.equal(lineAt('a\nb\nc', 2), 2);
  assert.equal(lineAt('a\nb\nc', 4), 3);
});
