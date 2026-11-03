// End-to-end tests of the CLI against throwaway projects.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const run = (dir, ...args) => execFileSync('node', [CLI, ...args, '--dir', dir], { encoding: 'utf8' });
const project = () => mkdtempSync(join(tmpdir(), 'cp-'));
const hook = (dir, name, payload) =>
  spawnSync('node', [join(dir, '.claude', 'hooks', `${name}.mjs`)], {
    input: JSON.stringify(payload),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  }).status;

test('audio-core alone installs without Stellix concepts', () => {
  const dir = project();
  const out = run(dir, 'init', 'audio-core');
  assert.match(out, /OK: base, audio-core/);
  assert.ok(!existsSync(join(dir, 'src', 'world')));
  const rule = readFileSync(join(dir, '.claude', 'rules', 'math-domain-guards.md'), 'utf8');
  assert.match(rule, /src\/dsp\/\*\*/);
  assert.doesNotMatch(rule, /src\/world/);
});

test('full Stellix install: nested GPU skills, CLAUDE.md block, hooks', () => {
  const dir = project();
  writeFileSync(join(dir, 'CLAUDE.md'), '# Stellix\nMy own intro.\n');
  run(dir, 'init', 'audio-core', 'gpu-painter', 'stellix');
  assert.ok(existsSync(join(dir, 'src', 'painter', '.claude', 'skills', 'gpu-frame-bench', 'SKILL.md')));
  assert.ok(!existsSync(join(dir, '.claude', 'skills', 'gpu-frame-bench')));
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /^# Stellix\nMy own intro\./);
  assert.match(md, /`src\/world\/`/);
  const settings = readFileSync(join(dir, '.claude', 'settings.json'), 'utf8');
  for (const h of ['lesson-checks', 'folder-law', 'realtime-guard', 'no-shipped-images', 'param-id-lock']) assert.match(settings, new RegExp(h));
});

test('an edited rule survives repeated updates', () => {
  const dir = project();
  run(dir, 'init', 'audio-core', 'gpu-painter');
  const rule = join(dir, '.claude', 'rules', 'gpu-bloom.md');
  appendFileSync(rule, '- my own note\n');
  run(dir, 'update');
  run(dir, 'update');
  assert.match(readFileSync(rule, 'utf8'), /my own note/);
  assert.ok(existsSync(`${rule}.pack-new`), 'new pack version saved beside the edited rule');
  assert.match(run(dir, 'doctor'), /OK:/);
  run(dir, 'update', '--force');
  assert.doesNotMatch(readFileSync(rule, 'utf8'), /my own note/);
});

test('moving a folder in layout.json re-points every rule', () => {
  const dir = project();
  run(dir, 'init', 'audio-core', 'stellix');
  const layoutFile = join(dir, '.claude', 'layout.json');
  const layout = JSON.parse(readFileSync(layoutFile, 'utf8'));
  layout.folders.world.path = 'src/sim';
  writeFileSync(layoutFile, JSON.stringify(layout));
  run(dir, 'update');
  assert.match(readFileSync(join(dir, '.claude', 'rules', 'world-fp-determinism.md'), 'utf8'), /src\/sim\/\*\*/);
});

test('folder law refuses new source files outside the layout', () => {
  const dir = project();
  run(dir, 'init', 'audio-core');
  const write = (p) => hook(dir, 'folder-law', { tool_name: 'Write', tool_input: { file_path: join(dir, p), content: 'x' } });
  assert.equal(write('src/Loose.cpp'), 2);
  assert.equal(write('Other/Thing.h'), 2);
  assert.equal(write('src/dsp/Svf.cpp'), 0);
  assert.equal(write('docs/notes.md'), 0);
});

test('removing a pack removes its rules and hooks', () => {
  const dir = project();
  run(dir, 'init', 'audio-core', 'stellix');
  run(dir, 'remove', 'stellix');
  const rules = readdirSync(join(dir, '.claude', 'rules'));
  assert.ok(!rules.includes('world-fp-determinism.md'));
  assert.doesNotMatch(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'), /no-shipped-images/);
});

test('an existing .claude and CLAUDE.md are updated, never overwritten', () => {
  const dir = project();
  mkdirSync(join(dir, '.claude', 'rules'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'rules', 'gpu-bloom.md'), '# my own bloom rule\n');
  writeFileSync(join(dir, '.claude', 'rules', 'my-law.md'), '# my law\n');
  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ model: 'x', hooks: { Stop: [{ matcher: '', hooks: [{ type: 'command', command: 'echo mine' }] }] } }));
  writeFileSync(join(dir, 'CLAUDE.md'), '# Project\nKeep this.\n');
  writeFileSync(join(dir, '.gitignore'), 'build/');
  run(dir, 'init', 'audio-core', 'gpu-painter');
  run(dir, 'update');
  assert.equal(readFileSync(join(dir, '.claude', 'rules', 'gpu-bloom.md'), 'utf8'), '# my own bloom rule\n');
  assert.ok(existsSync(join(dir, '.claude', 'rules', 'gpu-bloom.md.pack-new')));
  assert.equal(readFileSync(join(dir, '.claude', 'rules', 'my-law.md'), 'utf8'), '# my law\n');
  const s = JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'));
  assert.equal(s.model, 'x');
  assert.equal(s.hooks.Stop[0].hooks[0].command, 'echo mine');
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /^# Project\nKeep this\./);
  assert.equal(md.match(/claude-packs:start/g).length, 1, 'one generated section after two runs');
  assert.match(readFileSync(join(dir, '.gitignore'), 'utf8'), /^build\/\n\.claude\/\.claude-packs-backup\/\n\.claude\/state\/\n\.claude\/usage\.log\n\.claude\/hooks\.log\n$/);
  assert.ok(readdirSync(join(dir, '.claude', '.claude-packs-backup')).length >= 1);
});

test('a malformed settings.json stops the install before anything changes', () => {
  const dir = project();
  mkdirSync(join(dir, '.claude'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'settings.json'), '{ broken');
  writeFileSync(join(dir, 'CLAUDE.md'), 'mine\n');
  const r = spawnSync('node', [CLI, 'init', 'audio-core', '--dir', dir], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), 'mine\n');
  assert.ok(!existsSync(join(dir, '.claude', 'rules')));
});

test('the Stellix profile installs onto the real lib/ layout without touching house files', () => {
  const dir = project();
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src/tabula', 'lib/painter/src', '.claude/rules']) mkdirSync(join(dir, d), { recursive: true });
  writeFileSync(join(dir, '.claude', 'rules', 'world.md'), '# house world rule\n');
  run(dir, 'init', 'audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix');
  assert.ok(!existsSync(join(dir, 'src')), 'no default src/ folder in a complete layout');
  assert.equal(readFileSync(join(dir, '.claude', 'rules', 'world.md'), 'utf8'), '# house world rule\n');
  assert.match(readFileSync(join(dir, '.claude', 'rules', 'world-fp-determinism.md'), 'utf8'), /"lib\/world\/\*\*"/);
  assert.ok(existsSync(join(dir, 'lib', 'painter', '.claude', 'skills', 'gpu-capture', 'SKILL.md')));
  assert.ok(!existsSync(join(dir, '.claude', 'checks', 'one-seeded-random.json')), 'disabled in favour of the house gate');
  assert.doesNotMatch(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'), /no-shipped-images/);
  assert.equal(hook(dir, 'protect-vendor', { tool_name: 'Edit', tool_input: { file_path: join(dir, 'lib/engines/src/tabula/Voice.h') } }), 2);
});
