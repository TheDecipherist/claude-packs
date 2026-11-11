// lib/new.mts: `new <name>` refuses a bad name and a folder that is in use, before it writes anything. The scaffold itself
// (git, install, doctor) is the integration flow's (test/integration/new.test.mts).
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { newProject } from '../../../lib/new.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('a name that is not letters, digits, . _ - is refused, and nothing is made', async () => {
  const parent = scratchDir('new-');
  for (const bad of [undefined, '', '../escape', 'two words', '-lead', 'a/b']) {
    await assert.rejects(newProject(parent, bad), /name the project/, String(bad));
  }
  assert.equal(existsSync(join(parent, '..', 'escape')), false);
});

test('a folder that exists and is not empty is refused, with the command to use there, and is left as it was', async () => {
  const parent = scratchDir('new-used-');
  put(join(parent, 'shop', 'keep.txt'), 'mine\n');
  await assert.rejects(newProject(parent, 'shop'), /already exists and is not empty; use `npx --no-install @thedecipherist\/claude-packs init`/);
  assert.equal(existsSync(join(parent, 'shop', 'keep.txt')), true);
  assert.equal(existsSync(join(parent, 'shop', 'build.md')), false, 'no house file written into it');
});
