// 0.8.0: doctor runs the hooks' selftests a few at a time and names one that is killed for time as timed out, not as failing
// (all at once with 60 s each, the heavy ones were killed under load and read as failing, with no output).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
test('a selftest that hangs is reported as timed out', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cp-timeout-'));
  execFileSync('node', [CLI, 'init', 'audio-core', '--dir', dir], { encoding: 'utf8', env: { ...process.env, CLAUDE_PACKS_SELFTEST_S: '600', CLAUDE_PACKS_SELFTESTS: 'run' } });
  writeFileSync(join(dir, '.claude/hooks/zz-hangs.mjs'), "// --selftest\nsetTimeout(() => {}, 60000);\n");
  const r = spawnSync('node', [CLI, 'doctor', '--dir', dir], { encoding: 'utf8', env: { ...process.env, CLAUDE_PACKS_SELFTEST_S: '3', CLAUDE_PACKS_SELFTESTS: 'run' } });
  const said = r.stdout + r.stderr;
  assert.match(said, /zz-hangs\.mjs's selftest timed out after 3 s/);
  assert.doesNotMatch(said, /zz-hangs\.mjs fails its selftest/);
});
