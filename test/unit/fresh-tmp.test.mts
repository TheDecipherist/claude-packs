// The preload itself (KWB-166): what test/fresh-tmp.mts gives every test process, checked here, so a change to it picks this test,
// not every test that merely loads it (the user: "a pack that affects everything is not the same as it changed everything").
import assert from 'node:assert/strict';
import { existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { readJson } from '../../packs/base/hooks/lib/json.mts';

interface Kept { version: string; at: number }

test('the run has its own temp folder, by its real path (macOS /var is /private/var: KWB-158)', () => {
  const dir = process.env['TMPDIR'];
  assert.ok(dir && existsSync(dir), 'TMPDIR is a folder of this run');
  assert.equal(dir, realpathSync(dir), 'the real path');
  assert.match(dir, /claude-packs-test-/);
  assert.equal(tmpdir().replace(/\/$/, ''), dir.replace(/\/$/, ''), 'tmpdir() is it');
});

test('kit-fresh reads a kept answer inside the run, holding this kit\'s own version (no test reaches npm: KWB-156)', () => {
  const cache = process.env['CLAUDE_PACKS_CACHE_DIR'];
  const tmp = process.env['TMPDIR'] ?? '';
  assert.ok(cache && cache.startsWith(tmp), 'inside the run\'s folder');
  const kept = readJson<Kept>(join(cache, 'kit-fresh.json'));
  assert.ok(kept, 'a kept answer');
  assert.equal(kept.version, readJson<{ version: string }>(new URL('../../package.json', import.meta.url).pathname)?.version);
  assert.ok(Date.now() - kept.at < 24 * 3600 * 1000, 'today\'s');
});

test('selftests are the gate\'s, the memory of proved hooks is the run\'s, and no Claude process is the holder', () => {
  assert.equal(process.env['CLAUDE_PACKS_SELFTESTS'], 'gate', 'a test\'s install takes the hooks as proved by the gate (KWB-166)');
  assert.ok(process.env['CLAUDE_PACKS_SELFTEST_CACHE']?.startsWith(process.env['TMPDIR'] ?? '\0'), 'one memory a run, never an earlier run\'s (KWB-41)');
  assert.equal(process.env['CLAUDE_PID'], undefined, 'kit-lock never reads this process as a session (KWB-40)');
  assert.ok(process.env['CLAUDE_PACKS_FIXTURES'], 'the installs the tests copy are built under one folder of the run (test/fixtures/installs.mts)');
});

test('a run started inside governed hands its tests no grant and no priority: a test\'s own governed job takes its own (W8.8)', () => {
  assert.equal(process.env['CLAUDE_PACKS_GOVERNED'], undefined);
  assert.equal(process.env['CLAUDE_PACKS_PRIORITY'], undefined);
});
