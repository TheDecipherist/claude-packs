// program-writes.mts: the files an inline program writes, by any route (KWB-8); languages.mts and content.mts rows.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { programOf, programWrites } from '../../../packs/base/hooks/lib/program-writes.mts';
import { ALL_CODE, languageNamed, languageOf } from '../../../packs/base/hooks/lib/languages.mts';
import { isContent } from '../../../packs/base/hooks/lib/content.mts';

const at = (p: string): string => (p.startsWith('/') ? p : `/proj/${p}`);
const none = (): string | null => null;

test('programOf: inline programs only; a script file or -m is null', () => {
  assert.deepEqual(programOf('python3', ['-c', 'x=1'], null), { lang: 'python', code: 'x=1' });
  assert.deepEqual(programOf('node', ['-'], 'y'), { lang: 'node', code: 'y' });
  assert.equal(programOf('python3', ['tools/x.py'], null), null);
  assert.equal(programOf('python3', ['-m', 'mod'], null), null);
  assert.equal(programOf('ls', [], null), null);
});

test('programWrites: a literal write, a read is none, Path.home() comes from the parameter', () => {
  const w = programWrites({ lang: 'python', code: "open('a.txt','w').write('hi')" }, at, none);
  assert.deepEqual(w, [{ path: '/proj/a.txt', op: 'write', content: 'hi' }]);
  assert.deepEqual(programWrites({ lang: 'python', code: "open('a.txt').read()" }, at, none), []);
  const h = programWrites({ lang: 'python', code: "Path.home().joinpath('x') if 0 else None\nopen(Path.home() / 'n.txt', 'w').write('z')" }, at, none, '/h');
  assert.equal(h[0]?.path, '/h/n.txt');
  const unknown = programWrites({ lang: 'python', code: "open(Path.home() / 'n.txt', 'w').write('z')" }, at, none)[0];
  assert.equal(unknown?.named, true);
});

test('programWrites: an unresolvable path makes the named literals writes of unknown content (planted wrong input)', () => {
  const w = programWrites({ lang: 'node', code: "writeFileSync(dir + name, 'x'); const p = 'src/a.js'" }, at, none);
  assert.ok(w.some((x) => x.path === '/proj/src/a.js' && x.named === true && x.content === null));
});

test('languages and content', () => {
  assert.equal(languageOf('.mts')?.name, 'js');
  assert.equal(languageOf('.pyi')?.name, 'python');
  assert.equal(languageOf('.zzz'), null);
  assert.equal(languageNamed('rust')?.name, 'rust');
  assert.ok(ALL_CODE.has('.kts') && ALL_CODE.has('.dart'));
  assert.equal(isContent('blog/post.md'), true);
  assert.equal(isContent('src/blog/page.tsx'), false);
  assert.equal(isContent('docs/a.md', { guards: { content: ['docs/**'] } }), true);
});

test('programWrites: a write whose path did not resolve leaves an earlier write alone (KWB-177)', () => {
  const w = programWrites({ lang: 'python', code: "open('a.txt','w').write('x')\nopen(dyn + '.txt','w').write('y')" }, at, none);
  assert.equal(w.find((r) => r.path === '/proj/a.txt')?.content, 'x');
});
