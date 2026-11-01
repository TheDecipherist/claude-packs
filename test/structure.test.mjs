// The firm structure: CLAUDE.md says where each kind of thing goes, placement-law enforces it,
// and doctor --strict proves every rule fires on something and every file is under a rule.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
  // Painting code: the in-class form and the out-of-class form a .cpp uses.
  for (const paint of ['void paint (juce::Graphics& g) override {}', 'void Panel::paint (juce::Graphics& g) {}', 'void ui::Panel::paint (Graphics& g) {}']) {
    assert.equal(write('src/dsp/Panel.cpp', paint), 2, paint);
    assert.equal(write('src/app/Panel.cpp', paint), 0, paint);
  }
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

// The Stellix-build lessons (0.4.0) land in every install: the CLAUDE.md block, the three rules with
// live paths, and the two skills. Each assertion names the clause it protects.
test('the block, control, look and anchor laws and their skills install', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-'));
  run(dir, 'init', 'audio-core');
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /A blocking hook is a red check: fix the hook first/);
  assert.match(md, /stop and report its exact message/);
  assert.match(md, /When a command is refused or fails, the step fails/);
  assert.match(md, /Route around a block/);
  assert.match(md, /Point at a document by line number\. Cite a fixed anchor/);

  const rule = (name) => readFileSync(join(dir, '.claude/rules', `${name}.md`), 'utf8');
  const house = rule('house-control-behaviours');
  assert.match(house, /"src\/app\/\*\*"/, 'loads on the UI folders');
  for (const clause of [/Double click returns it to its parameter's default/, /Fine drag/, /mouse wheel/, /value is readable while it is moved/, /never takes keyboard focus/, /One gesture is one undo step/, /built once in the shared control piece/]) assert.match(house, clause);
  const look = rule('ui-matches-reference-look');
  assert.match(look, /"src\/app\/\*\*"/);
  for (const clause of [/glow/, /surfaces/, /every control's parts/, /gaps between elements/, /contrast/, /Gate the look/, /picture stop/]) assert.match(look, clause);
  const anchors = rule('references-use-anchors');
  assert.match(anchors, /"docs\/\*\*"/);
  assert.match(anchors, /never by line number/);

  for (const skill of ['new-panel-control', 'analyse-reference-look']) {
    assert.match(readFileSync(join(dir, '.claude/skills', skill, 'SKILL.md'), 'utf8'), /^description: Use when|^description: Use before/m);
  }
});

// Sub37 (docs/project.md answer b): the kit on the synthkit template's tree as it is, nothing moved.
test('the Sub37 profile fits the template tree: laws, kinds and the id lock', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-'));
  const put = (rel, text) => { mkdirSync(join(dir, rel, '..'), { recursive: true }); writeFileSync(join(dir, rel), text); };
  put('src/PluginProcessor.cpp', 'void Sub37::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) {}\n');
  put('src/engine/Engine.cpp', 'int engine;\n');
  put('src/generated/Sub37Params.h', '{ "osc1_wave", "Osc 1 Wave", "float", 0.0f, 1.0f, 0.333f, "", "[MAN p.25]" },\n');
  put('panel/bindings.json', '{ "bindings": { "cursor": { "kind": "select" } } }\n');
  put('tools/sync_probe.cpp', 'int main() {}\n');
  run(dir, 'init', 'audio-core', '--profile', 'sub37');
  assert.match(run(dir, 'doctor'), /OK: base, audio-core/);
  for (const d of ['src/app', 'src/audio', 'src/dsp', 'tests']) assert.equal(existsSync(join(dir, d)), false, `no default ${d}/`);

  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /the generated headers .* → `src\/generated\/`/);
  assert.match(md, /a probe or gate .* → `tools\/`/);
  assert.match(readFileSync(join(dir, '.claude/rules/house-control-behaviours.md'), 'utf8'), /"src\/ui\/\*\*"/);
  assert.match(readFileSync(join(dir, '.claude/rules/audio-thread-realtime-safe.md'), 'utf8'), /"src\/engine\/\*\*"/);

  const write = (h, rel, content = '// x\n') =>
    spawnSync('node', [join(dir, '.claude/hooks', h)], { input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } }), env: { ...process.env, CLAUDE_PROJECT_DIR: dir } }).status;
  assert.equal(write('folder-law.mjs', 'src/SharedLook.h'), 0, 'flat src/ is the app folder');
  assert.equal(write('folder-law.mjs', 'tools/spread2_probe.cpp'), 0);
  assert.equal(write('folder-law.mjs', 'lib/Stray.cpp'), 2);
  assert.equal(write('placement-law.mjs', 'src/engine/Voice.cpp', 'void V::processBlock (A& b) {}'), 0);
  assert.equal(write('placement-law.mjs', 'src/patch/Program.cpp', 'void V::processBlock (A& b) {}'), 2);
  assert.equal(write('placement-law.mjs', 'src/ui/Panel.cpp', 'void Panel::paint (juce::Graphics& g) {}'), 0);
  assert.equal(write('placement-law.mjs', 'src/engine/Scope.cpp', 'void Scope::paint (juce::Graphics& g) {}'), 2);
  assert.equal(write('placement-law.mjs', 'src/engine/Scope.h', 'void paint (juce::Graphics& g) override;'), 2);
  assert.equal(write('placement-law.mjs', 'src/ui/Sub37Params.h'), 2);
  assert.equal(write('placement-law.mjs', 'tools/sub_probe.cpp'), 0);
  assert.equal(write('placement-law.mjs', 'src/ui/sub_probe.cpp'), 2);
  assert.equal(write('protect-vendor.mjs', 'design/reference/baseline/analysis.md'), 2);

  // The id lock reads the generated header and the panel binding ids, and refuses losing either.
  const lock = join(dir, '.claude/hooks/param-id-lock.mjs');
  const env = { ...process.env, CLAUDE_PROJECT_DIR: dir };
  execFileSync('node', [lock, '--init'], { cwd: dir, env });
  assert.deepEqual(JSON.parse(readFileSync(join(dir, '.claude/param-ids.lock.json'), 'utf8')), ['cursor', 'osc1_wave']);
  writeFileSync(join(dir, 'panel/bindings.json'), '{ "bindings": {} }\n');
  const post = spawnSync('node', [lock], { input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: join(dir, 'panel/bindings.json') } }), env, encoding: 'utf8' });
  assert.equal(post.status, 2);
  assert.match(post.stderr, /cursor/);
});

test('the Stellix profile refuses both paint forms outside the UI', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-'));
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  run(dir, 'init', 'audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix');
  const write = (rel, content) => hook(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } }).status;
  for (const paint of ['void paint (juce::Graphics& g) override {}', 'void Panel::paint (juce::Graphics& g) {}']) {
    assert.equal(write('lib/world/src/Panel.cpp', paint), 2, paint);
    assert.equal(write('lib/app/src/Panel.cpp', paint), 0, paint);
  }
});

test('an install that copied the old paint pattern gets the new one; a project pattern is kept', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cps-'));
  run(dir, 'init', 'audio-core');
  const file = join(dir, '.claude/layout.json');
  const set = (content) => { const l = JSON.parse(readFileSync(file, 'utf8')); l.kinds.editor.content = content; writeFileSync(file, JSON.stringify(l)); };
  const now = () => JSON.parse(readFileSync(file, 'utf8')).kinds.editor.content;
  set('\\bvoid\\s+paint\\s*\\(\\s*(juce::)?Graphics\\b');
  run(dir, 'update');
  assert.equal(now(), '\\bvoid\\s+(?:\\w+::)*paint\\s*\\(\\s*(?:juce::)?Graphics\\b');
  assert.ok(!('contentWas' in JSON.parse(readFileSync(file, 'utf8')).kinds.editor));
  set('\\bvoid\\s+draw\\b');
  run(dir, 'update');
  assert.equal(now(), '\\bvoid\\s+draw\\b');
});
