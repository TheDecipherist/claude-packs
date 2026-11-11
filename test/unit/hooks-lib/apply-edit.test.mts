// apply-edit.mts: a Write, Edit or MultiEdit worked out as the file's text before and after; null where the edit cannot apply.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { computeEdit } from '../../../packs/base/hooks/lib/apply-edit.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('a Write gives the file as it was and the new content; a new file was empty', () => {
  const dir = scratchDir('apply-edit-');
  const file = join(dir, 'a.txt');
  put(file, 'old');
  assert.deepEqual(computeEdit('Write', { file_path: file, content: 'new' }), { before: 'old', after: 'new' });
  assert.deepEqual(computeEdit('Write', { file_path: join(dir, 'none.txt'), content: 'x' }), { before: '', after: 'x' });
});

test('an Edit replaces the first match, all of them with replace_all, and never reads $ in the new text as a pattern', () => {
  const file = join(scratchDir('apply-edit-'), 'a.txt');
  put(file, 'a b a');
  assert.equal(computeEdit('Edit', { file_path: file, old_string: 'a', new_string: 'x' })?.after, 'x b a');
  assert.equal(computeEdit('Edit', { file_path: file, old_string: 'a', new_string: 'x', replace_all: true })?.after, 'x b x');
  assert.equal(computeEdit('Edit', { file_path: file, old_string: 'b', new_string: '$&$&' })?.after, 'a $&$& a');
});

test('a MultiEdit applies its edits in order, each to the result of the one before', () => {
  const file = join(scratchDir('apply-edit-'), 'a.txt');
  put(file, 'one');
  const got = computeEdit('MultiEdit', { file_path: file, edits: [{ old_string: 'one', new_string: 'two' }, { old_string: 'two', new_string: 'three' }] });
  assert.deepEqual(got, { before: 'one', after: 'three' });
});

test('an edit whose old text is not in the file (or is missing) is null, so the hook lets it through', () => {
  const file = join(scratchDir('apply-edit-'), 'a.txt');
  put(file, 'abc');
  assert.equal(computeEdit('Edit', { file_path: file, old_string: 'zzz', new_string: 'x' }), null);
  assert.equal(computeEdit('Edit', { file_path: file, new_string: 'x' }), null);
  assert.equal(computeEdit('MultiEdit', { file_path: file, edits: [{ old_string: 'abc', new_string: 'x' }, { old_string: 'abc', new_string: 'y' }] }), null);
});
