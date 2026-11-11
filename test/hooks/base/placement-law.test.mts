// placement-law: each kind of thing goes in its one folder. The hook's contract, then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { write } from '../../fixtures/installs.mts';
import { assert, existsSync, execFileSync, fresh, hookRun, mkdirSync, profile, readFileSync, run, spawnSync, test, writeFileSync, cli } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';

holdsTheContract({
  hook: 'placement-law.mjs',
  dir: () => fixture('audio-core+gpu-painter'),
  same: (project) => ({ payload: write(join(project, 'src/core/glow.wgsl'), '@fragment fn fs() {}'), status: 2 }),
});

const RT_BAD = 'void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) { auto* x = new float[64]; }';
const judged = (dir: string, rel: string, content = '// x\n') => hookRun(dir, 'placement-law.mjs', write(join(dir, rel), content));

test('placement-law refuses audio code added outside its folder by every route', () => {
  assert.deepEqual(unrefused(routeProject(), 'placement-law.mjs', 'src/params/Helper.cpp', '// helper\nPLACEHOLDER\n', RT_BAD.replace('auto* x = new float[64];', '')), []);
});

test('CLAUDE.md states where every kind of thing goes', () => {
  const md = readFileSync(join(fixture('audio-core+gpu-painter'), 'CLAUDE.md'), 'utf8');
  assert.match(md, /processBlock, voices.* → `src\/audio\/`/);
  assert.match(md, /WGSL shaders → `src\/painter\/shaders\/`/);
  assert.match(md, /the factory bank and the parameter table → `data\/`/);
  assert.match(md, /placement-law/);
});

test('placement-law refuses audio, GPU and shader code in the wrong folder', () => {
  const dir = fixture('audio-core+gpu-painter');
  const status = (rel: string, content: string): number | null => judged(dir, rel, content).status;
  assert.equal(status('src/params/Helper.cpp', 'void Synth::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) {}'), 2);
  assert.equal(status('src/audio/Synth.cpp', 'void Synth::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) {}'), 0);
  assert.equal(status('src/audio/Meter.cpp', 'wgpuQueueSubmit (q, 1, &cmd);'), 2);
  assert.equal(status('src/painter/Device.cpp', 'wgpuQueueSubmit (q, 1, &cmd);'), 0);
  assert.equal(status('src/app/glow.wgsl', '@fragment fn fs() {}'), 2);
  assert.equal(status('src/dsp/factory.csv', 'id,name'), 2);
  assert.equal(status('data/factory.csv', 'id,name'), 0);
  // Painting code: the in-class form and the out-of-class form a .cpp uses.
  for (const paint of ['void paint (juce::Graphics& g) override {}', 'void Panel::paint (juce::Graphics& g) {}', 'void ui::Panel::paint (Graphics& g) {}']) {
    assert.equal(status('src/dsp/Panel.cpp', paint), 2, paint);
    assert.equal(status('src/app/Panel.cpp', paint), 0, paint);
  }
  assert.match(judged(dir, 'src/app/x.wgsl', '').stderr, /goes in src\/painter\//);
});

test('the Stellix profile carries its own kinds', () => {
  const dir = fixture('stellix-profile');
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src/tabula', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /travellers, strikes.* → `lib\/world\/`/);
  assert.equal(judged(dir, 'lib/world/src/glow.wgsl', '').status, 2);
  assert.equal(judged(dir, 'lib/painter/src/glow.wgsl', '').status, 0);
});

// Sub37 (docs/project.md answer b): the kit on the synthkit template's tree as it is, nothing moved. The profile is applied at
// `init` over files that already exist, so the install is this test's subject.
test('the Sub37 profile fits the template tree: laws, kinds and the id lock', () => {
  const dir = fresh('cps-');
  const seed = (rel: string, text: string): void => put(join(dir, rel), text);
  seed('src/PluginProcessor.cpp', 'void Sub37::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) {}\n');
  seed('src/engine/Engine.cpp', 'int engine;\n');
  seed('src/generated/Sub37Params.h', '{ "osc1_wave", "Osc 1 Wave", "float", 0.0f, 1.0f, 0.333f, "", "[MAN p.25]" },\n');
  seed('panel/bindings.json', '{ "bindings": { "cursor": { "kind": "select" } } }\n');
  seed('tools/sync_probe.cpp', 'int main() {}\n');
  run(dir, 'init', 'audio-core', '--profile', profile('sub37'));
  assert.match(cli(dir, 'doctor').stdout, /^1 problem\(s\)$/m, 'only the rules whose tests the project has yet to write');
  for (const d of ['src/app', 'src/audio', 'src/dsp', 'tests']) assert.equal(existsSync(join(dir, d)), false, `no default ${d}/`);

  const md = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(md, /the generated headers .* → `src\/generated\/`/);
  assert.match(md, /a probe or gate .* → `tools\/`/);
  assert.match(readFileSync(join(dir, '.claude/rules/house-control-behaviours.md'), 'utf8'), /"src\/ui\/\*\*"/);
  assert.match(readFileSync(join(dir, '.claude/rules/audio-thread-realtime-safe.md'), 'utf8'), /"src\/engine\/\*\*"/);

  const fired = (hook: string, rel: string, content = '// x\n'): number | null => hookRun(dir, hook, write(join(dir, rel), content)).status;
  assert.equal(fired('folder-law.mjs', 'src/SharedLook.h'), 0, 'flat src/ is the app folder');
  assert.equal(fired('folder-law.mjs', 'tools/spread2_probe.cpp'), 0);
  assert.equal(fired('folder-law.mjs', 'lib/Stray.cpp'), 2);
  assert.equal(fired('placement-law.mjs', 'src/engine/Voice.cpp', 'void V::processBlock (A& b) {}'), 0);
  assert.equal(fired('placement-law.mjs', 'src/patch/Program.cpp', 'void V::processBlock (A& b) {}'), 2);
  assert.equal(fired('placement-law.mjs', 'src/ui/Panel.cpp', 'void Panel::paint (juce::Graphics& g) {}'), 0);
  assert.equal(fired('placement-law.mjs', 'src/engine/Scope.cpp', 'void Scope::paint (juce::Graphics& g) {}'), 2);
  assert.equal(fired('placement-law.mjs', 'src/engine/Scope.h', 'void paint (juce::Graphics& g) override;'), 2);
  assert.equal(fired('placement-law.mjs', 'src/ui/Sub37Params.h'), 2);
  assert.equal(fired('placement-law.mjs', 'tools/sub_probe.cpp'), 0);
  assert.equal(fired('placement-law.mjs', 'src/ui/sub_probe.cpp'), 2);
  assert.equal(fired('protect-vendor.mjs', 'design/reference/baseline/analysis.md'), 2);

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
  const dir = fixture('stellix-profile');
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  for (const paint of ['void paint (juce::Graphics& g) override {}', 'void Panel::paint (juce::Graphics& g) {}']) {
    assert.equal(judged(dir, 'lib/world/src/Panel.cpp', paint).status, 2, paint);
    assert.equal(judged(dir, 'lib/app/src/Panel.cpp', paint).status, 0, paint);
  }
});
