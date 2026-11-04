// The kit's command as the 0.10.0 tests run it (one place, so their headers are not copies of each other): the CLI path, run
// (throws on a non-zero exit, returns stdout), cli (returns the spawn result), a fresh folder, a hook fired as Claude Code fires it.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export { default as assert } from 'node:assert/strict';
export { test } from 'node:test';
export { execFileSync, spawnSync, join };
export { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';

export const KIT = fileURLToPath(new URL('..', import.meta.url));
export const CLI = join(KIT, 'bin/claude-packs.mjs');
export const run = (dir, ...args) => execFileSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8' });
export const cli = (dir, ...args) => spawnSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8' });
export const fresh = (prefix) => mkdtempSync(join(tmpdir(), prefix));
export const hookRun = (dir, name, payload) =>
  spawnSync('node', [join(dir, '.claude/hooks', name)], { input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
export const hookStatus = (dir, name, payload) => hookRun(dir, name, payload).status;
export const selftest = (dir, hook) => spawnSync('node', [join(dir, '.claude/hooks', hook), '--selftest'], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
