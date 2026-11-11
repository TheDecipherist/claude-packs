// d-22: project.mts `real` and dup.mts `realPath` are two helpers on purpose. For a path that does not exist yet they answer
// differently, and once-only matches on the dup answer. A future merge of the two turns one of these red.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { realPath } from '../../../packs/base/hooks/lib/dup.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { real } from '../../../packs/base/hooks/lib/project.mts';

function linked(): { actual: string; link: string } {
  const base = scratchDir('real-paths-');
  const actual = join(base, 'actual');
  const link = join(base, 'link');
  mkdirSync(actual);
  symlinkSync(actual, link);
  return { actual, link };
}

test('a missing file under a linked folder: realPath resolves the existing parent, real keeps the path as written', () => {
  const { actual, link } = linked();
  const missing = join(link, 'new', 'file.txt'); // neither `new` nor the file exists yet
  assert.equal(realPath(missing), join(actual, 'new', 'file.txt'));
  assert.equal(real(missing), missing);
  assert.notEqual(real(missing), realPath(missing));
});

test('an existing path: both resolve the link, so only a missing path tells them apart', () => {
  const { actual, link } = linked();
  assert.equal(real(link), actual);
  assert.equal(realPath(link), actual);
});

test('a missing path several levels under a link: realPath still resolves the link, real never does', () => {
  const { actual, link } = linked();
  const nowhere = join(link, 'a', 'b');
  assert.equal(real(nowhere), nowhere);
  assert.equal(realPath(nowhere), join(actual, 'a', 'b'));
});
