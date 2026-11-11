// lib/scan.mts: the pointer `fix` reads the last scan through. The scan itself (copy, install, checks, report) runs in
// test/integration/scan.test.mts; here only what has no install to wait for.
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { pointerOf, rememberScan } from '../../../lib/scan.mts';
import { readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('the pointer is in the temp folder, one per project path, and the same path always gives the same one', () => {
  const a = scratchDir('scan-a-');
  const b = scratchDir('scan-b-');
  assert.ok(pointerOf(a).startsWith(join(tmpdir(), 'claude-packs-last-scan-')));
  assert.equal(pointerOf(a), pointerOf(a));
  assert.notEqual(pointerOf(a), pointerOf(b));
  assert.equal(pointerOf(a), pointerOf(`${a}/./`), 'a path spelled another way is the same project');
});

test('a remembered scan is the text written, and a second one replaces it', () => {
  const dir = scratchDir('scan-pointer-');
  rememberScan(dir, '{"first":1}');
  assert.equal(readText(pointerOf(dir)), '{"first":1}');
  rememberScan(dir, '{"second":2}');
  assert.equal(readText(pointerOf(dir)), '{"second":2}');
});
