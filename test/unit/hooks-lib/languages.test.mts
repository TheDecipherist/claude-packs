// languages.mts: one row per language for the statement reader: lookup by extension, blanking, and how a function is defined.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_CODE, LANGUAGES, languageNamed, languageOf } from '../../../packs/base/hooks/lib/languages.mts';

test('an extension finds its row and a name finds the same row; an unknown one is null', () => {
  assert.equal(languageOf('.py')?.name, 'python');
  assert.equal(languageOf('.cpp')?.name, 'c');
  assert.equal(languageOf('.go')?.name, 'go');
  assert.equal(languageOf('.rs')?.name, 'rust');
  assert.equal(languageOf('.sh')?.name, 'shell');
  assert.equal(languageOf('.md'), null);
  assert.equal(languageOf(''), null);
  assert.equal(languageNamed('lua'), languageOf('.lua'));
  assert.equal(languageNamed('cobol'), null);
});

test('every row has its extensions in ALL_CODE and a name no other row has', () => {
  for (const l of LANGUAGES) for (const e of l.exts) assert.ok(ALL_CODE.has(e), `${l.name} ${e}`);
  assert.equal(new Set(LANGUAGES.map((l) => l.name)).size, LANGUAGES.length);
});

test('each row\'s blanker removes a comment, keeps offsets, and leaves code', () => {
  const samples: readonly (readonly [ext: string, text: string])[] = [
    ['.c', 'int a; // gone\nint b;'], ['.py', 'a = 1  # gone\nb = 2'], ['.go', 'a := 1 // gone\nb := 2'], ['.rb', 'a = 1 # gone\nb = 2'],
    ['.lua', 'a = 1 -- gone\nb = 2'], ['.php', 'a(); // gone\nb();'], ['.sh', 'a=1 # gone\nb=2'], ['.java', 'int a; // gone\nint b;'],
  ];
  for (const [ext, text] of samples) {
    const out = languageOf(ext)?.blank(text) ?? '';
    assert.equal(out.length, text.length, ext);
    assert.ok(!out.includes('gone'), `${ext}: ${out}`);
    assert.ok(out.includes(text.split('\n')[1] ?? '?'), `${ext} keeps code`);
  }
});

test('a shell # inside a word is no comment, and a string\'s text is blanked but its quotes stay: planted wrong input', () => {
  const sh = languageOf('.sh');
  assert.ok(sh?.blank('echo a#b').includes('a#b'));
  assert.equal(languageOf('.py')?.blank('x = "secret"'), 'x = "      "');
});

test('a row\'s define pattern finds the function names it should', () => {
  const names = (ext: string, text: string): string[] => {
    const re = languageOf(ext)?.define;
    return re ? [...text.matchAll(new RegExp(re.source, re.flags))].map((m) => m.slice(1).find((g) => g) ?? '') : [];
  };
  assert.deepEqual(names('.py', 'def a():\n  pass\nclass B:\n  pass\n'), ['a', 'B']);
  assert.deepEqual(names('.go', 'func Run() {}\nfunc main() {}\n'), ['Run', 'main']);
  assert.deepEqual(names('.rs', 'pub fn one() {}\nfn two() {}\n'), ['one', 'two']);
  assert.deepEqual(names('.js', 'export async function load() {}\nconst f = (x) => x\n'), ['load', 'f']);
});
