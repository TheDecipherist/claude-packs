// 0.9.2: brief-guard's refusal counter (.claude/usage.log) is a local log: an install ignores it, so a step's save never stops on it.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
test('an install ignores .claude/usage.log', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cp-ignore-'));
  execFileSync('node', [CLI, 'init', 'audio-core', '--dir', dir], { encoding: 'utf8' });
  assert.ok(readFileSync(join(dir, '.gitignore'), 'utf8').split('\n').includes('.claude/usage.log'));
});
