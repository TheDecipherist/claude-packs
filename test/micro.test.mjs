// The micro rules, skills and hooks harvested from MDD, mddkit and superpowers.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const run = (dir, ...a) => execFileSync('node', [CLI, ...a, '--dir', dir], { encoding: 'utf8' });
const hook = (dir, name, payload) =>
  spawnSync('node', [join(dir, '.claude', 'hooks', `${name}.mjs`)], { input: JSON.stringify(payload), env: { ...process.env, CLAUDE_PROJECT_DIR: dir } }).status;
const tool = (dir, name, ...a) => spawnSync('node', [join(dir, '.claude', 'tools', `${name}.mjs`), ...a], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });

test('new rules resolve to real paths and doctor passes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cpm-'));
  assert.match(run(dir, 'init', 'audio-core'), /OK:/);
  assert.match(readFileSync(join(dir, '.claude/rules/skill-writing.md'), 'utf8'), /\.claude\/skills\/\*\*/);
  assert.match(readFileSync(join(dir, '.claude/rules/open-items-tagged.md'), 'utf8'), /bugs\.md/);
  assert.match(readFileSync(join(dir, '.claude/rules/one-formula-per-value.md'), 'utf8'), /src\/dsp\/\*\*/);
  assert.ok(existsSync(join(dir, '.claude/skills/trace-parameter/SKILL.md')));
});

test('file-size-guard refuses growth past 300 lines, allows splitting', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cpm-'));
  run(dir, 'init', 'audio-core');
  const f = join(dir, 'src/dsp/Big.cpp');
  writeFileSync(f, 'x\n'.repeat(300));
  assert.equal(hook(dir, 'file-size-guard', { tool_name: 'Edit', tool_input: { file_path: f, old_string: 'x\n', new_string: 'x\ny\n' } }), 2);
  writeFileSync(f, 'x\n'.repeat(400));
  assert.equal(hook(dir, 'file-size-guard', { tool_name: 'Write', tool_input: { file_path: f, content: 'x\n'.repeat(350) } }), 0);
});

test('freeze, red gate and frozen-files work together', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cpm-'));
  run(dir, 'init', 'audio-core');
  mkdirSync(join(dir, 'tests'), { recursive: true });
  tool(dir, 'freeze', 'on', 'bug 7', 'tests/bug_7*');
  assert.equal(hook(dir, 'frozen-files', { tool_name: 'Edit', tool_input: { file_path: join(dir, 'tests/bug_7_test.cpp') } }), 2);
  assert.equal(hook(dir, 'frozen-files', { tool_name: 'Edit', tool_input: { file_path: join(dir, 'src/dsp/Svf.cpp') } }), 0);
  const red = tool(dir, 'test-verdict', '--red', 'bug_7', '--', 'printf "50%% tests passed, 1 tests failed out of 2\\n\\nThe following tests FAILED:\\n\\t  2 - bug_7 (Failed)\\n"');
  assert.equal(red.status, 0);
  assert.match(red.stdout, /RED_CONFIRMED/);
  tool(dir, 'freeze', 'off');
  assert.equal(hook(dir, 'frozen-files', { tool_name: 'Edit', tool_input: { file_path: join(dir, 'tests/bug_7_test.cpp') } }), 0);
});

test('stage-guard is on by default and off in the Stellix profile', () => {
  const plain = mkdtempSync(join(tmpdir(), 'cpm-'));
  run(plain, 'init', 'audio-core');
  assert.equal(hook(plain, 'stage-guard', { tool_name: 'Bash', tool_input: { command: 'git add -A' } }), 2);
  const stellix = mkdtempSync(join(tmpdir(), 'cpm-'));
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src/tabula', 'lib/painter/src']) mkdirSync(join(stellix, d), { recursive: true });
  run(stellix, 'init', 'audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix');
  assert.ok(!existsSync(join(stellix, '.claude/hooks/stage-guard.mjs')));
  assert.match(readFileSync(join(stellix, '.claude/rules/skill-writing.md'), 'utf8'), /\.claude\/skills/);
});

test('doctor flags a skill whose description summarizes steps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cpm-'));
  run(dir, 'init', 'audio-core');
  const f = join(dir, '.claude/skills/measure-tone/SKILL.md');
  writeFileSync(f, readFileSync(f, 'utf8').replace(/^description: Use/m, 'description: Renders tones and'));
  const r = spawnSync('node', [CLI, 'doctor', '--dir', dir], { encoding: 'utf8' });
  assert.match(r.stdout, /must start with "Use when/);
});
