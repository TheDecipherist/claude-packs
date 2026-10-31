// The firm structure: CLAUDE.md says where each kind of thing goes, placement-law enforces it,
// and doctor --strict proves every rule fires on something and every file is under a rule.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const run = (dir, ...a) => execFileSync('node', [CLI, ...a, '--dir', dir], { encoding: 'utf8' });
const hook = (dir, payload) =>
  spawnSync('node', [join(dir, '.claude/hooks/placement-law.mjs')], { input: JSON.stringify(payload), env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });

test('CLAUDE.md states where every kind of thing goes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-'));
  run(dir, 'init', 'audio-core', 'gpu-painter');
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /processBlock, voices.* → `src\/audio\/`/);
  assert.match(md, /WGSL shaders → `src\/painter\/shaders\/`/);
  assert.match(md, /the factory bank and the parameter table → `data\/`/);
  assert.match(md, /placement-law/);
});

test('placement-law refuses audio, GPU and shader code in the wrong folder', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-'));
  run(dir, 'init', 'audio-core', 'gpu-painter');
  const write = (rel, content) => hook(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } }).status;
  assert.equal(write('src/params/Helper.cpp', 'void Synth::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) {}'), 2);
  assert.equal(write('src/audio/Synth.cpp', 'void Synth::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) {}'), 0);
  assert.equal(write('src/audio/Meter.cpp', 'wgpuQueueSubmit (q, 1, &cmd);'), 2);
  assert.equal(write('src/painter/Device.cpp', 'wgpuQueueSubmit (q, 1, &cmd);'), 0);
  assert.equal(write('src/app/glow.wgsl', '@fragment fn fs() {}'), 2);
  assert.equal(write('src/dsp/factory.csv', 'id,name'), 2);
  assert.equal(write('data/factory.csv', 'id,name'), 0);
  assert.match(hook(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, 'src/app/x.wgsl'), content: '' } }).stderr, /goes in src\/painter\//);
});

test('doctor --strict fails while a source file sits outside every rule, passes once it moves', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-'));
  run(dir, 'init', 'audio-core');
  mkdirSync(join(dir, 'lib'), { recursive: true });
  writeFileSync(join(dir, 'lib/Stray.cpp'), 'int x;\n');
  writeFileSync(join(dir, 'src/dsp/Svf.cpp'), 'int y;\n');
  const strict = spawnSync('node', [CLI, 'doctor', '--strict', '--dir', dir], { encoding: 'utf8' });
  assert.equal(strict.status, 1);
  assert.match(strict.stdout, /source file\(s\) no rule covers.*lib\/Stray\.cpp/);
  assert.match(run(dir, 'doctor'), /note: .*no rule covers/);
});

test('the Stellix profile carries its own kinds', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-'));
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src/tabula', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  run(dir, 'init', 'audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix');
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /travellers, strikes.* → `lib\/world\/`/);
  assert.equal(hook(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, 'lib/world/src/glow.wgsl'), content: '' } }).status, 2);
  assert.equal(hook(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, 'lib/painter/src/glow.wgsl'), content: '' } }).status, 0);
});
