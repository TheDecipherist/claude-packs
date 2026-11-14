// init and update write the house files the base rules read, where they are missing, as `new` does (KWB-next: supernova2_monitor was
// set up by `init` and had no build.md, so making-line-first had no In progress entry to read and every task would be sent back).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { ensureHouseFiles, HOUSE_FILES } from '../../../lib/new.mts';

test('a folder with none gets every house file, build.md with its In progress section', () => {
  const dir = scratchDir('house-');
  assert.deepEqual(ensureHouseFiles(dir, 'demo'), [...HOUSE_FILES]);
  assert.match(readText(join(dir, 'build.md')) ?? '', /^# demo: the build[\s\S]*^## In progress$/m);
  for (const rel of HOUSE_FILES) assert.ok(readText(join(dir, rel)), rel);
});

test('a house file the project already has is never touched', () => {
  const dir = scratchDir('house-');
  put(join(dir, 'build.md'), 'the project\'s own\n');
  assert.ok(!ensureHouseFiles(dir, 'demo').includes('build.md'));
  assert.equal(readText(join(dir, 'build.md')), 'the project\'s own\n');
  assert.deepEqual(ensureHouseFiles(dir, 'demo'), [], 'a second run writes nothing');
});
