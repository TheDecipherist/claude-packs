// shell-writes.mts: every file a shell command writes, by redirect, heredoc, cp, mv, tee, touch, cd and variables, with the text after.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { afterText, shellWrites } from '../../../packs/base/hooks/lib/shell-writes.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const at = (command: string, cwd = '/w'): { path: string; op: string }[] => shellWrites(command, cwd, {}).map((w) => ({ path: w.path, op: w.op }));

test('a redirect writes, a double one appends, and /dev/null writes nothing', () => {
  assert.deepEqual(at('echo hi > a.txt'), [{ path: '/w/a.txt', op: 'write' }]);
  assert.deepEqual(at('echo hi >> a.txt'), [{ path: '/w/a.txt', op: 'append' }]);
  assert.deepEqual(at('ls > /dev/null 2>&1'), []);
});

test('a heredoc\'s body is the text written', () => {
  const w = shellWrites('cat > a.md <<EOF\nline one\nEOF', '/w', {});
  assert.equal(w[0]?.path, '/w/a.md');
  assert.equal(w[0]?.content, 'line one\n');
});

test('cd moves where a path starts, a child shell\'s cd ends with it, and a variable names its folder', () => {
  assert.deepEqual(at('cd sub && echo x > a'), [{ path: '/w/sub/a', op: 'write' }]);
  assert.deepEqual(at('(cd sub && echo x > a); echo y > b'), [{ path: '/w/sub/a', op: 'write' }, { path: '/w/b', op: 'write' }]);
  assert.deepEqual(at('D=/tmp/x; echo y > $D/a'), [{ path: '/tmp/x/a', op: 'write' }]);
});

test('commands that only read write nothing, and a planted empty command is none', () => {
  assert.deepEqual(at('git status && ls -la | grep x'), []);
  assert.deepEqual(at(''), []);
});

test('afterText says the text after: appended onto what is there, unknown where it cannot be known', () => {
  const dir = scratchDir('shellw-');
  const file = join(dir, 'f.txt');
  put(file, 'one\n');
  const [appended] = shellWrites(`echo two >> ${file}`, dir, {});
  assert.ok(appended);
  const r = afterText(appended);
  assert.equal(r.before, 'one\n');
  assert.ok(r.after === null || r.after.startsWith('one\n'));
  assert.equal(afterText({ path: file, op: 'touch', content: null }).after, 'one\n');
  assert.equal(afterText({ path: file, op: 'delete', content: null }).after, null);
});
