// writes.mts: every file a tool call writes, by any route, and the one frame a write guard judges them in.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { WRITE_TOOLS, readPayload, writesOf } from '../../../packs/base/hooks/lib/writes.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('Write, Edit and MultiEdit give the file with its text before and after', () => {
  const dir = scratchDir('writes-');
  const file = join(dir, 'a.txt');
  put(file, 'one two\n');
  assert.deepEqual(writesOf({ tool_name: 'Write', tool_input: { file_path: file, content: 'new' } }, dir, {}), [{ path: file, op: 'write', before: 'one two\n', after: 'new' }]);
  const edit = writesOf({ tool_name: 'Edit', tool_input: { file_path: 'a.txt', old_string: 'two', new_string: '2' } }, dir, {});
  assert.equal(edit[0]?.after, 'one 2\n');
  assert.equal(edit[0]?.op, 'edit');
  const multi = writesOf({ tool_name: 'MultiEdit', tool_input: { file_path: file, edits: [{ old_string: 'one', new_string: '1' }, { old_string: 'two', new_string: '2' }] } }, dir, {});
  assert.equal(multi[0]?.after, '1 2\n');
});

test('a NotebookEdit appends its cell, and a Bash redirect is a write too', () => {
  const dir = scratchDir('writes-');
  const nb = writesOf({ tool_name: 'NotebookEdit', tool_input: { notebook_path: 'n.ipynb', new_source: 'x=1' } }, dir, {});
  assert.equal(nb[0]?.after, 'x=1\n');
  const sh = writesOf({ tool_name: 'Bash', tool_input: { command: 'echo hi > out.txt' }, cwd: dir }, dir, {});
  assert.equal(sh[0]?.path, join(dir, 'out.txt'));
  assert.equal(sh[0]?.after, 'hi\n');
});

test('two sed edits of one file in one command are one change', () => {
  const dir = scratchDir('writes-');
  const file = join(dir, 'f.txt');
  put(file, 'a b\n');
  const w = writesOf({ tool_name: 'Bash', tool_input: { command: `sed -i 's/a/1/' ${file} && sed -i 's/b/2/' ${file}` }, cwd: dir }, dir, {});
  assert.equal(w.length, 1);
  assert.ok(w[0]?.after === null || w[0]?.after === '1 2\n', 'GNU sed gave the text of both, or none is installed');
});

test('a tool that writes nothing, or names no file, gives none; the tools list holds Bash', () => {
  assert.deepEqual(writesOf({ tool_name: 'Read', tool_input: { file_path: '/x' } }, '/w', {}), []);
  assert.deepEqual(writesOf({ tool_name: 'Write', tool_input: {} }, '/w', {}), []);
  assert.ok(WRITE_TOOLS.includes('Bash'));
});

test('readPayload takes a JSON object and refuses everything else', () => {
  assert.deepEqual(readPayload('{"tool_name":"Write"}'), { tool_name: 'Write' });
  assert.equal(readPayload('[1]'), null);
  assert.equal(readPayload('not json'), null);
  assert.equal(readPayload(''), null);
});
