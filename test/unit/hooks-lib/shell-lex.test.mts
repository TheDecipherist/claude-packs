// shell-lex.mts: the one owner of heredoc cutting, quote blanking, command splitting and installedPackages (W2.5).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blankQuotes, cutHeredocs, dropHeredocs, installedPackages, lex, splitCommand } from '../../../packs/base/hooks/lib/shell-lex.mts';
import { bareWords } from '../../../packs/base/hooks/lib/command-prefix.mts';
import { gitAdds } from '../../../packs/base/hooks/lib/git-adds.mts';
import { evaluate, scan } from '../../../packs/base/hooks/lib/program-read.mts';
import { maskSecrets } from '../../../packs/base/hooks/lib/secret-patterns.mts';

test('cutHeredocs keeps each body in order and leaves a numbered marker', () => {
  const { text, bodies } = cutHeredocs('cat <<EOF > a\nhello\nEOF\ncat <<-X\n\tbye\n\tX\nls');
  assert.deepEqual(bodies, ['hello\n', 'bye\n']);
  assert.match(text, /<<HEREDOC0/);
  assert.match(text, /<<HEREDOC1/);
  assert.ok(text.endsWith('ls'));
});

test('lex removes quotes from words and reads redirections and control operators', () => {
  assert.deepEqual(lex(`echo 'a b' "c\\"d" > out; ls | wc`), [
    { w: 'echo' }, { w: 'a b' }, { w: 'c"d' }, { op: '>', fd: '', doc: undefined }, { w: 'out' }, { op: ';' }, { w: 'ls' }, { op: '|' }, { w: 'wc' },
  ]);
  assert.deepEqual(lex('2>&1'), [{ op: '>&', fd: '2', doc: undefined }]);
});

test('dropHeredocs, blankQuotes and splitCommand', () => {
  assert.equal(dropHeredocs('cat <<EOF\ngit add .\nEOF\nls'), 'cat \nls');
  assert.equal(blankQuotes(`echo "a && b" 'c'`), "echo '' ''");
  assert.deepEqual(splitCommand('a && b || c; d | e'), ['a ', ' b ', ' c', ' d ', ' e']);
  assert.deepEqual(splitCommand('a\nb', { newline: true }), ['a', 'b']);
  assert.deepEqual(splitCommand('a & b', { background: true }), ['a ', ' b']);
  assert.deepEqual(splitCommand('a >& b', { background: true }), ['a >& b']);
  assert.deepEqual(splitCommand('a $(b)', { subshell: true }), ['a ', 'b', '']);
});

test('installedPackages reads every install call and leaves flags and heredoc text out', () => {
  assert.deepEqual(installedPackages('npm i -D zod@3 left-pad && pnpm add foo; ls'), [
    { part: 'npm i -D zod@3 left-pad', packages: ['zod@3', 'left-pad'] },
    { part: 'pnpm add foo', packages: ['foo'] },
  ]);
  assert.deepEqual(installedPackages('cat <<EOF\nnpm install evil\nEOF'), []);
  assert.deepEqual(installedPackages('npm run build'), []); // planted wrong input: not an install
});

test('bareWords drops assignments and wrappers with their options', () => {
  assert.deepEqual(bareWords(['FOO=1', 'timeout', '-k', '5', '100', 'git', 'push']), ['git', 'push']);
  assert.deepEqual(bareWords(['sudo', '-u', 'me', 'env', 'A=b', 'ls']), ['ls']);
  assert.deepEqual(bareWords([]), []);
});

test('gitAdds finds adds with their folder, skips dry runs and heredoc text', () => {
  assert.deepEqual(gitAdds('git -C sub add a b && git add -n c', '/r'), [{ dir: '/r/sub', args: ['a', 'b'] }]);
  assert.deepEqual(gitAdds('cat <<EOF\ngit add x\nEOF', '/r'), []);
});

test('program-read scans literals and evaluates a joined path with the caller\'s home', () => {
  const { code, lits } = scan(`p = Path.home() / "a" / 'b'`, 'python');
  assert.deepEqual(lits, ['a', 'b']);
  const ctx = { env: new Map(), lits, lang: 'python', at: (p: string) => p, readText: () => null, home: '/h' };
  assert.deepEqual(evaluate(code.split('=')[1] ?? '', ctx), { t: 'path', v: '/h/a/b' });
  assert.equal(evaluate('Path.home()', { ...ctx, home: undefined }), null);
});

test('maskSecrets masks a token and a password word', () => {
  assert.equal(maskSecrets('x ghp_' + 'a'.repeat(36)), 'x [a GitHub token]');
  assert.equal(maskSecrets('password=hunter22'), 'password=[masked]');
});
