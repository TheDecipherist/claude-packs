// The one global install: latest-versions skill + version-pin-guard hook.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const HOOK = fileURLToPath(new URL('../global/hooks/version-pin-guard.mjs', import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), 'cpg-'));
const cli = (home, ...a) => execFileSync('node', [CLI, 'global', ...a, '--home', home], { encoding: 'utf8' });
const guard = (dir, payload) => spawnSync('node', [HOOK], { input: JSON.stringify(payload), env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
const today = new Date().toISOString().slice(0, 10);

test('global add keeps existing settings and user files, remove undoes only ours', () => {
  const home = tmp();
  mkdirSync(join(home, '.claude', 'skills', 'latest-versions'), { recursive: true });
  writeFileSync(join(home, '.claude', 'skills', 'latest-versions', 'SKILL.md'), '# mine\n');
  writeFileSync(join(home, '.claude', 'settings.json'), JSON.stringify({ model: 'opus', hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'mine.sh' }] }] } }));
  cli(home, 'add');
  cli(home, 'add');
  assert.equal(readFileSync(join(home, '.claude', 'skills', 'latest-versions', 'SKILL.md'), 'utf8'), '# mine\n');
  assert.ok(existsSync(join(home, '.claude', 'skills', 'latest-versions', 'SKILL.md.pack-new')));
  const s = JSON.parse(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'));
  assert.equal(s.model, 'opus');
  assert.equal(s.hooks.PreToolUse.length, 2, 'ours added once, theirs kept');
  assert.match(cli(home, 'doctor'), /OK/);
  cli(home, 'remove');
  const after = JSON.parse(readFileSync(join(home, '.claude', 'settings.json'), 'utf8'));
  assert.deepEqual(after.hooks.PreToolUse, [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'mine.sh' }] }]);
  assert.ok(!existsSync(join(home, '.claude', 'hooks', 'claude-packs', 'version-pin-guard.mjs')));
  assert.equal(readFileSync(join(home, '.claude', 'skills', 'latest-versions', 'SKILL.md'), 'utf8'), '# mine\n');
});

test('malformed global settings.json stops before anything changes', () => {
  const home = tmp();
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(join(home, '.claude', 'settings.json'), '{ nope');
  const r = spawnSync('node', [CLI, 'global', 'add', '--home', home]);
  assert.equal(r.status, 2);
  assert.ok(!existsSync(join(home, '.claude', 'skills')));
});

test('the guard blocks an unchecked pin and passes once versions.md has a fresh row', () => {
  const dir = tmp();
  const cmake = join(dir, 'CMakeLists.txt');
  writeFileSync(cmake, 'FetchContent_Declare(JUCE GIT_TAG 8.0.4)\n');
  const edit = { tool_name: 'Edit', tool_input: { file_path: cmake, old_string: '8.0.4', new_string: '9.0.4' } };
  const blocked = guard(dir, edit);
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /JUCE 9\.0\.4: no row/);
  mkdirSync(join(dir, 'docs'));
  writeFileSync(join(dir, 'docs', 'versions.md'), `| name | latest | checked | source | used | decision |\n|---|---|---|---|---|---|\n| JUCE | 9.0.4 | 2020-01-01 | url | 8.0.4 | x |\n`);
  assert.match(guard(dir, edit).stderr, /over 14 days/);
  writeFileSync(join(dir, 'docs', 'versions.md'), `| JUCE | 9.0.4 | ${today} | https://github.com/juce-framework/JUCE/releases | 9.0.4 | upgrade |\n`);
  assert.equal(guard(dir, edit).status, 0);
  assert.equal(guard(dir, { tool_name: 'Edit', tool_input: { file_path: cmake, old_string: 'FetchContent', new_string: 'FetchContent' } }).status, 0, 'no pin change, no check');
  assert.equal(guard(dir, { tool_name: 'Bash', tool_input: { command: 'npm install fastify' } }).status, 2);
  assert.equal(guard(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, 'src.cpp'), content: 'x' } }).status, 0);
});
