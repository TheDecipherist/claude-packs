// The one global install: latest-versions skill + version-pin-guard hook.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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
  assert.equal(s.hooks.PreToolUse.length, 3, 'ours added once (version-pin-guard; shell-traps on Bash), theirs kept');
  assert.equal(s.hooks.PreToolUse.flatMap((g) => g.hooks).filter((h) => /shell-traps\.py/.test(h.command)).length, 1);
  assert.equal(s.hooks.SessionStart.flatMap((g) => g.hooks).filter((h) => /gnu-shell\.py/.test(h.command)).length, 1);
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

// The global part is exactly three pieces (Tim, 2026-10-31): latest-versions with version-pin-guard, gnu-shell and
// shell-traps. Nothing else: build-guard is a base-pack project hook. A hand-installed identical copy is taken over and its
// settings entry never doubled; anything else in ~/.claude (a hand-kept build-guard, a skill) is left exactly as it was.
test('global add installs exactly latest-versions, gnu-shell and shell-traps, and nothing else', () => {
  const home = tmp();
  const claude = join(home, '.claude');
  const hooks = join(claude, 'hooks');
  mkdirSync(hooks, { recursive: true });
  const pkg = (f) => fileURLToPath(new URL(`../global/hooks/${f}`, import.meta.url));
  writeFileSync(join(hooks, 'shell-traps.py'), readFileSync(pkg('shell-traps.py')));
  writeFileSync(join(hooks, 'build-guard.py'), '# the hand-kept one\n');
  const buildEntry = { matcher: 'Bash', hooks: [{ type: 'command', command: 'python3 "$HOME/.claude/hooks/build-guard.py"' }] };
  writeFileSync(join(claude, 'settings.json'), JSON.stringify({ hooks: {
    PreToolUse: [buildEntry, { matcher: 'Bash', hooks: [{ type: 'command', command: 'python3 "$HOME/.claude/hooks/shell-traps.py"' }] }],
    SessionStart: [{ hooks: [{ type: 'command', command: 'python3 "$HOME/.claude/hooks/gnu-shell.py"' }] }],
  } }));
  const out = cli(home, 'add');
  assert.match(out, /latest-versions .*gnu-shell and shell-traps/);
  const list = (dir, base = '') => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(join(dir, e.name), `${base}${e.name}/`) : [`${base}${e.name}`]));
  assert.deepEqual(list(claude).sort(), [
    'claude-packs-global.json', 'hooks/build-guard.py', 'hooks/claude-packs/lib/shell-writes.mjs', 'hooks/claude-packs/version-pin-guard.mjs',
    'hooks/gnu-shell.py', 'hooks/shell-traps.py', 'settings.json', 'skills/latest-versions/SKILL.md',
  ], 'the three pieces, and the hand-kept build-guard untouched');
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(claude, 'claude-packs-global.json'), 'utf8')).files).sort(), [
    'hooks/claude-packs/lib/shell-writes.mjs', 'hooks/claude-packs/version-pin-guard.mjs', 'hooks/gnu-shell.py', 'hooks/shell-traps.py', 'skills/latest-versions/SKILL.md',
  ]);
  assert.equal(readFileSync(join(hooks, 'build-guard.py'), 'utf8'), '# the hand-kept one\n');
  const s = JSON.parse(readFileSync(join(claude, 'settings.json'), 'utf8'));
  const all = Object.values(s.hooks).flat().flatMap((g) => g.hooks).map((h) => h.command);
  for (const name of ['shell-traps.py', 'gnu-shell.py', 'version-pin-guard.mjs', 'build-guard.py']) assert.equal(all.filter((c) => c.includes(name)).length, 1, name);
  assert.ok(!existsSync(join(hooks, 'shell-traps.py.pack-new')), 'an identical copy is taken over, not shadowed');
  const gnu = readFileSync(join(hooks, 'gnu-shell.py'), 'utf8');
  assert.match(gnu, /\$HOME\/\.claude\/bin/);
  assert.match(gnu, /ZSH_VERSION/);
  for (const f of ['shell-traps.py', 'gnu-shell.py']) assert.equal(spawnSync('python3', [pkg(f), '--selftest'], { env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } }).status, 0, f);
  assert.ok(!existsSync(fileURLToPath(new URL('../global/hooks/build-guard.py', import.meta.url))), 'build-guard is not global');
  assert.ok(existsSync(fileURLToPath(new URL('../packs/base/hooks/build-guard.py', import.meta.url))), 'build-guard is a base-pack hook');
  assert.match(readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8'), /Global by design: they fix this machine's shell for Claude, not any project's rules\./);
  cli(home, 'remove');
  const after = JSON.parse(readFileSync(join(claude, 'settings.json'), 'utf8'));
  assert.deepEqual(after.hooks.PreToolUse, [buildEntry], 'remove takes only ours away');
});

test('version-pin-guard never reads a shell redirection as a package', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'docs.md'), '');
  const bash = (command) => guard(dir, { tool_name: 'Bash', tool_input: { command } });
  for (const command of ['npm install 2>&1 | tail -3', 'npm ci > /tmp/npm.log 2>&1', 'pip install -r requirements.txt 2>&1 &']) {
    const r = bash(command);
    assert.equal(r.status, 0, `${command}: ${r.stderr}`);
  }
  const r = bash('npm install fastify 2>&1 | tail -3');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /fastify \(unpinned\): no row/);
  assert.doesNotMatch(r.stderr, /2 &1|&1/);
});
