// 0.9.2: brief-guard's refusal counter (.claude/usage.log) is a local log: an install ignores it, so a step's save never stops on it.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
// 0.9.12: the hooks' timing log (.claude/hooks.log, KWB-24) is local too.
test('an install ignores .claude/usage.log and .claude/hooks.log', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cp-ignore-'));
  execFileSync('node', [CLI, 'init', 'audio-core', '--dir', dir], { encoding: 'utf8' });
  const lines = readFileSync(join(dir, '.gitignore'), 'utf8').split('\n');
  for (const f of ['.claude/usage.log', '.claude/hooks.log']) assert.ok(lines.includes(f), f);
});
