// Agents work in git worktrees under .claude/worktrees/, while CLAUDE_PROJECT_DIR still points at the
// main checkout. Every hook must judge a worktree file against its own checkout (Stellix WB-41, WB-55:
// folder-law refused every new file in a worktree, and agents routed new code into unrelated files).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { CLI, PIN_GUARD, bash, fire, fireAs, project, put, stellix } from './worktree-rig.mjs';
import { PACK_CASES } from './worktree-cases-packs.mjs';

test('folder-law allows a new file in a right folder of a worktree and refuses a wrong one', () => {
  const { here, wt } = stellix();
  assert.equal(fire(here, 'folder-law.mjs', join(wt, 'lib/app/src/host_groups.h')), 0);
  assert.equal(fire(here, 'folder-law.mjs', join(wt, 'random/stray.cpp')), 2);
  assert.equal(fire(here, 'folder-law.mjs', join(here, 'lib/app/src/fine.h')), 0);
  assert.equal(fire(here, 'folder-law.mjs', join(here, 'random/stray.cpp')), 2);
});

test('file-size-guard measures a worktree file by its own checkout', () => {
  const { here, wt } = stellix();
  assert.equal(fire(here, 'file-size-guard.mjs', join(wt, 'lib/app/src/small.h')), 0);
  assert.equal(fire(here, 'file-size-guard.mjs', join(wt, 'lib/app/src/huge.h'), 'x\n'.repeat(400)), 2);
});

const PARAMS = (...ids) => ids.map((id) => `auto p_${id} = juce::ParameterID { "${id}", 1 };`).join('\n') + '\n';
const APVTS = 'void Filter::prepare (juce::AudioProcessorValueTreeState& apvts) { cutoff = apvts.getRawParameterValue ("cutoff"); }\n';
const RT_BAD = 'void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) { auto* x = new float[64]; }\n';

// once-only, making, making-check (0.9.0): a function to copy, and a manifest with one many concept.
const SVF = (name, k = '2.0f') => `float ${name}::process (float x) noexcept\n{\n    const float g = std::tan (kPi * cutoff / sampleRate);\n    const float k = ${k} - 2.0f * resonance;\n` +
  '    const float a1 = 1.0f / (1.0f + g * (g + k));\n    const float a2 = g * a1;\n    const float a3 = g * a2;\n    const float v3 = x - ic2eq;\n' +
  '    const float v1 = a1 * ic1eq + a2 * v3;\n    const float v2 = ic2eq + a2 * ic1eq + a3 * v3;\n    ic1eq = 2.0f * v1 - ic1eq;\n    ic2eq = 2.0f * v2 - ic2eq;\n    return v2;\n}';
const SHAPE = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] };

// One case per installed hook: the worktree file it must allow and the one it must refuse, judged
// from the worktree's own checkout. A hook added to the packs without a case here, or in worktree-cases-packs.mjs for a hook
// a pack other than base adds, fails the test.
const CASES = {
  ...PACK_CASES,
  // the runner as settings.json runs it (KWB-24): the hooks it names judge a worktree file against the worktree, and the
  // timing lines go to the main checkout's log (CLAUDE_PROJECT_DIR)
  'run-hooks.mjs': ({ here, wt }) => {
    const via = (file, content = '// new\n') => spawnSync('node', [join(here, '.claude/hooks/run-hooks.mjs'), '.claude/hooks/folder-law.mjs', '.claude/hooks/file-size-guard.mjs'],
      { input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: file, content } }), env: { ...process.env, CLAUDE_PROJECT_DIR: here }, encoding: 'utf8' });
    assert.equal(via(join(wt, 'src/dsp/Svf.cpp')).status, 0);
    assert.equal(via(join(wt, 'stray/Svf.cpp')).status, 2);
    assert.equal(via(join(wt, 'src/dsp/Huge.cpp'), 'x\n'.repeat(400)).status, 2);
    assert.match(readFileSync(join(here, '.claude/hooks.log'), 'utf8'), /\tfolder-law\t\d+\t2\tWrite/);
  },
  'folder-law.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'folder-law.mjs', join(wt, 'src/dsp/Svf.cpp')), 0);
    assert.equal(fire(here, 'folder-law.mjs', join(wt, 'stray/Svf.cpp')), 2);
  },
  'file-size-guard.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'file-size-guard.mjs', join(wt, 'src/dsp/Small.cpp')), 0);
    assert.equal(fire(here, 'file-size-guard.mjs', join(wt, 'src/dsp/Huge.cpp'), 'x\n'.repeat(400)), 2);
  },
  'placement-law.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'placement-law.mjs', join(wt, 'src/painter/shaders/glow.wgsl'), '@fragment fn fs() {}'), 0);
    assert.equal(fire(here, 'placement-law.mjs', join(wt, 'src/dsp/glow.wgsl'), '@fragment fn fs() {}'), 2);
  },
  'shape-law.mjs': ({ here, wt }) => {
    // the worktree's branch added a concept to its own manifest: its design/shape.json decides, not main's
    const shape = { concepts: { lane: { shape: 'many', count: 8, generator: 'laneId(i)', words: ['lane', 'lanes'] } }, exclude: [] };
    put(join(wt, 'design/shape.json'), JSON.stringify(shape));
    assert.equal(fire(here, 'shape-law.mjs', join(wt, 'src/dsp/Lanes.cpp'), 'if (laneIx == 3) go();\n'), 2);
    assert.equal(fire(here, 'shape-law.mjs', join(wt, 'src/dsp/Lanes.cpp'), 'for (int lane = 0; lane < kLanes; ++lane) go(lane);\n'), 0);
    assert.equal(fire(here, 'shape-law.mjs', join(here, 'src/dsp/Lanes.cpp'), 'if (laneIx == 3) go();\n'), 0);
  },
  'brief-guard.mjs': ({ here, wt }) => {
    const shape = { concepts: { lane: { shape: 'many', count: 8, generator: 'laneId(i)', words: ['lane', 'lanes'] } }, exclude: [] };
    put(join(wt, 'design/shape.json'), JSON.stringify(shape));
    assert.equal(fire(here, 'brief-guard.mjs', join(wt, 'docs/brief.md'), 'Drive lane 3.\n'), 2);
    assert.equal(fire(here, 'brief-guard.mjs', join(wt, 'docs/brief.md'), 'seen in: lane 3; build for every lane\n'), 0);
  },
  'lesson-checks.mjs': ({ here, wt }) => {
    // The worktree's branch moved DSP into src/synth: its own layout.json decides, not main's.
    const layoutFile = join(wt, '.claude/layout.json');
    const layout = JSON.parse(readFileSync(layoutFile, 'utf8'));
    layout.concepts.dsp = [...layout.concepts.dsp, 'src/synth/**'];
    writeFileSync(layoutFile, JSON.stringify(layout, null, 2));
    assert.equal(fire(here, 'lesson-checks.mjs', join(wt, 'src/dsp/Filter.cpp'), APVTS), 2);
    assert.equal(fire(here, 'lesson-checks.mjs', join(wt, 'src/synth/Filter.cpp'), APVTS), 2);
    assert.equal(fire(here, 'lesson-checks.mjs', join(here, 'src/synth/Filter.cpp'), APVTS), 0);
    assert.equal(fire(here, 'lesson-checks.mjs', join(wt, 'src/dsp/Filter.cpp'), 'void Filter::setParams (const P& p) noexcept {}\n'), 0);
  },
  'frozen-files.mjs': ({ here, wt }) => {
    const env = { ...process.env, CLAUDE_PROJECT_DIR: here };
    execFileSync('node', [join(here, '.claude/tools/freeze.mjs'), 'on', 'bug 7', 'tests/**'], { env, stdio: 'ignore' });
    assert.equal(fire(here, 'frozen-files.mjs', join(wt, 'tests/svf_test.cpp')), 2);
    assert.equal(fire(here, 'frozen-files.mjs', join(wt, 'src/dsp/Svf.cpp')), 0);
    execFileSync('node', [join(here, '.claude/tools/freeze.mjs'), 'off'], { env, stdio: 'ignore' });
  },
  'spec-lock.mjs': ({ here, wt }) => {
    const lock = (...a) => execFileSync('node', [join(here, '.claude/hooks/spec-lock.mjs'), ...a], { env: { ...process.env, CLAUDE_PROJECT_DIR: here }, stdio: 'ignore' });
    lock('lock', 'build running');
    assert.equal(fire(here, 'spec-lock.mjs', join(wt, 'docs/stellix-spec.md')), 2);
    assert.equal(fire(here, 'spec-lock.mjs', join(wt, 'src/dsp/Svf.cpp')), 0);
    assert.equal(bash(here, 'spec-lock.mjs', `sed -i '' s/a/b/ ${join(wt, 'spec/plan.md')}`), 2);
    assert.equal(bash(here, 'spec-lock.mjs', `sed -i '' s/a/b/ ${join(wt, 'src/dsp/Svf.cpp')}`), 0);
    lock('unlock');
  },
  'secrets-guard.mjs': ({ here, wt }) => {
    put(join(wt, '.gitignore'), '.env\n');   // the worktree ignores .env; main does not (yet)
    assert.equal(fire(here, 'secrets-guard.mjs', join(wt, '.env'), 'A=1\n'), 0, 'ignored by the worktree');
    assert.equal(fire(here, 'secrets-guard.mjs', join(here, '.env'), 'A=1\n'), 2, 'not ignored by main');
    assert.equal(bash(here, 'secrets-guard.mjs', `git -C ${wt} add .env`), 2);
  },
  'untrusted-boundary.mjs': ({ here, wt }) => {
    const call = 'const r = await client.messages.create({ messages: [{ role: "user", content: page }] });\n';
    assert.equal(fire(here, 'untrusted-boundary.mjs', join(wt, 'tools/ask.mjs'), call), 2);
    assert.equal(fire(here, 'untrusted-boundary.mjs', join(wt, 'tools/ask.mjs'), `const page = wrapUntrusted(html);\n${call}`), 0);
  },
  'stage-guard.mjs': ({ here, wt }) => {
    assert.equal(bash(here, 'stage-guard.mjs', `git -C ${wt} add -A`), 2);
    assert.equal(bash(here, 'stage-guard.mjs', `git -C ${wt} add src/dsp/Svf.cpp`), 0);
  },
  'git-guard.mjs': ({ here, wt }) => {
    assert.equal(bash(here, 'git-guard.mjs', `git -C ${wt} push -u https://x-access-token:abc@github.com/a/b.git work/x`), 2);
    assert.equal(bash(here, 'git-guard.mjs', `git -C ${wt} push -u origin work/x`), 0);
  },
  'realtime-guard.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'realtime-guard.mjs', join(wt, 'src/audio/Voice.cpp'), RT_BAD), 2);
    assert.equal(fire(here, 'realtime-guard.mjs', join(wt, 'src/audio/Voice.cpp'), 'void Voice::processBlock (B& b, M& m) { juce::ScopedNoDenormals noDenormals; b.clear(); }\n'), 0);
  },
  'param-id-lock.mjs': ({ here, wt }) => {
    // PostToolUse: the edit is already on disk. A worktree that drops an id is refused even though
    // main still has it; a worktree's new id goes into the worktree's lock, never main's.
    const post = (file) => fireAs(here, 'param-id-lock.mjs', { tool_name: 'Write', tool_input: { file_path: file } }).status;
    put(join(wt, 'src/params/Params.h'), PARAMS('cutoff'));
    assert.equal(post(join(wt, 'src/params/Params.h')), 2);
    put(join(wt, 'src/params/Params.h'), PARAMS('cutoff', 'res', 'drive'));
    assert.equal(post(join(wt, 'src/params/Params.h')), 0);
    assert.ok(JSON.parse(readFileSync(join(wt, '.claude/param-ids.lock.json'), 'utf8')).includes('drive'));
    assert.ok(!JSON.parse(readFileSync(join(here, '.claude/param-ids.lock.json'), 'utf8')).includes('drive'));
    // Main drops an id the worktree still has: the worktree's copy must not hide it.
    put(join(here, 'src/params/Params.h'), PARAMS('cutoff'));
    assert.equal(post(join(here, 'src/params/Params.h')), 2);
    put(join(here, 'src/params/Params.h'), PARAMS('cutoff', 'res'));
  },
  'suite-once.mjs': ({ here, wt }) => {
    // The checkout the command runs in decides what is the whole suite: the worktree's layout names its own suite command, main's
    // does not. Nobody asked for a full run (1.3.0: the gate is the changed tests; a full run only on the user's request).
    const layout = JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8'));
    put(join(wt, '.claude/layout.json'), JSON.stringify({ ...layout, commands: { ...layout.commands, test: 'bash tools/all.sh' } }));
    assert.equal(bash(here, 'suite-once.mjs', `cd ${wt} && bash tools/all.sh`), 2);
    assert.equal(bash(here, 'suite-once.mjs', `cd ${here} && bash tools/all.sh`), 0);
  },
  'template-law.mjs': ({ here, wt }) => {
    // The worktree's branch already has this element; main does not. Each checkout is read on its own.
    const el = (t) => `<div class="tile"><h3 class="name">${t}</h3><p>${t}</p></div>\n`;
    put(join(wt, 'src/app/one.html'), el('One'));
    assert.equal(fire(here, 'template-law.mjs', join(wt, 'src/app/two.html'), el('Two')), 2);
    assert.equal(fire(here, 'template-law.mjs', join(here, 'src/app/two.html'), el('Two')), 0);
  },
  'dispatch-once.mjs': ({ here, wt }) => {
    // The worktree's branch already switches on blendStyle; main does not. Each checkout is scanned on its own.
    put(join(wt, 'src/dsp/Blend.cpp'), 'float blend (Layer& l) { switch (l.blendStyle) { default: return 0.0f; } }\n');
    const second = 'int label (Layer& l) { switch (l.blendStyle) { default: return 0; } }\n';
    assert.equal(fire(here, 'dispatch-once.mjs', join(wt, 'src/dsp/Label.cpp'), second), 2);
    assert.equal(fire(here, 'dispatch-once.mjs', join(here, 'src/dsp/Label.cpp'), second), 0);
  },
  'once-only.mjs': ({ here, wt }) => {
    // the function lives only in the worktree: a near-copy is refused there, and judged against main's tree in main
    put(join(wt, 'src/dsp/Svf.cpp'), `#include "Svf.h"\n\n${SVF('Svf')}\n`);
    assert.equal(fire(here, 'once-only.mjs', join(wt, 'src/dsp/Copy.cpp'), SVF('Copy', '1.5f')), 2);
    assert.equal(fire(here, 'once-only.mjs', join(wt, 'src/dsp/Voice.cpp'), 'float Voice::render (float x) noexcept { return svf.process (x); }\n'), 0);
    assert.equal(fire(here, 'once-only.mjs', join(here, 'src/dsp/Copy.cpp'), SVF('Copy', '1.5f')), 0);
  },
  'code-shape.mjs': ({ here, wt }) => {
    // The worktree's layout lifts the limit; main's does not. A file is judged by its own checkout's layout.
    const packed = 'void f() {\n  a(); b(); c();\n}\n';
    put(join(wt, '.claude/layout.json'), JSON.stringify({ ...JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8')), guards: { codeShape: { maxStatementsPerLine: 9 } } }));
    assert.equal(fire(here, 'code-shape.mjs', join(wt, 'src/app/one.cpp'), packed), 0);
    assert.equal(fire(here, 'code-shape.mjs', join(here, 'src/app/one.cpp'), packed), 2);
  },
  'repo-litter.mjs': ({ here, wt }) => {
    // The worktree's layout allows this asset; main's does not. A git add is judged by the checkout it runs in.
    put(join(wt, 'hero.png'), 'x');
    put(join(here, 'hero.png'), 'x');
    put(join(wt, '.claude/layout.json'), JSON.stringify({ ...JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8')), guards: { repoLitter: { allow: ['hero.png'] } } }));
    const add = (cwd) => fireAs(here, 'repo-litter.mjs', { tool_name: 'Bash', tool_input: { command: 'git add hero.png' }, cwd }).status;
    assert.equal(add(wt), 0);
    assert.equal(add(here), 2);
  },
  'skill-first.mjs': ({ here, wt }) => {
    // The worktree's layout names its sheets as circuit material; main's does not. The transcript has no skill loaded, and the
    // project installs read-a-circuit-diagram (reverse-engineering), so the row applies.
    put(join(wt, 'sheets/board.png'), 'x');
    put(join(here, 'sheets/board.png'), 'x');
    const layout = JSON.parse(readFileSync(join(wt, '.claude/layout.json'), 'utf8'));
    put(join(wt, '.claude/layout.json'), JSON.stringify({ ...layout, guards: { ...layout.guards, circuitSkill: { sources: ['sheets/**'] } } }));
    const transcript = join(here, 'unloaded.jsonl');
    put(transcript, '{"type":"user"}\n');
    const read = (root) => fireAs(here, 'skill-first.mjs', { tool_name: 'Read', tool_input: { file_path: join(root, 'sheets/board.png') }, cwd: root, transcript_path: transcript }).status;
    assert.equal(read(wt), 2);
    assert.equal(read(here), 0);
  },
  'reuse-hint.mjs': ({ here, wt }) => {
    // The worktree's branch has this helper; main does not. A prompt is judged by the checkout it was typed in.
    put(join(wt, 'src/app/dates.ts'), 'export function formatDateRange(a, b) {\n  return a;\n}\n');
    const said = (cwd) => fireAs(here, 'reuse-hint.mjs', { hook_event_name: 'UserPromptSubmit', prompt: 'format the date range', cwd }).stdout;
    assert.match(said(wt), /formatDateRange/);
    assert.doesNotMatch(said(here), /formatDateRange/);
  },
  'making.mjs': ({ here, wt }) => {
    put(join(wt, 'design/shape.json'), JSON.stringify(SHAPE));
    const said = (cwd) => fireAs(here, 'making.mjs', { hook_event_name: 'UserPromptSubmit', prompt: 'drive slot 2 louder', cwd }).stdout;
    assert.match(said(wt), /you named slot 2: building for all slots/);
    assert.doesNotMatch(said(here), /you named/, 'main has no manifest yet');
  },
  'making-check.mjs': ({ here, wt }) => {
    put(join(wt, 'design/shape.json'), JSON.stringify(SHAPE));
    put(join(wt, 'build.md'), '# x\n\n## In progress\n\n| when | work/x | the gain; making: one gain per slot; concepts: slot (many, 4); reuse: slotGain in src/dsp/Gain.cpp | started |\n\n## Steps\n');
    const stop = (cwd, into = cwd) => {
      const t = join(cwd, 'transcript.jsonl');
      const use = { type: 'assistant', cwd, message: { content: [{ type: 'tool_use', id: 'w1', name: 'Write', input: { file_path: join(into, 'src/dsp/Gain.cpp'), content: 'float slotGain (int slot) { return gains[slot]; }\n' } }] } };
      writeFileSync(t, [{ type: 'user', message: { content: 'go' } }, use].map((e) => JSON.stringify(e)).join('\n'));
      return fireAs(here, 'making-check.mjs', { hook_event_name: 'Stop', transcript_path: t, cwd, session_id: `wt-${cwd.length}` }).status;
    };
    assert.equal(stop(wt), 0, 'the worktree has its manifest and its making line');
    assert.equal(stop(here), 2, 'main has neither');
    // Stellix WB-86: a session sitting in the main checkout that writes into a worktree is judged by the worktree's build.md
    assert.equal(stop(here, wt), 0, 'a write into the worktree, from the main checkout, is judged by the worktree');
  },
};

test('every hook judges a worktree file against the worktree, inside a real git worktree', () => {
  const p = project(['audio-core', 'gpu-painter', 'stellix', 'reverse-engineering'], (dir) => {
    const lf = join(dir, '.claude/layout.json');
    const layout = JSON.parse(readFileSync(lf, 'utf8'));
    layout.folders.engines_copy = { path: 'src/engines/copied', kind: 'copy', purpose: 'a copy tree' };
    layout.guards = { copy: { tools: ['tools/copy_in.py'] }, git: { refuseTrunk: true } };
    layout.enable = ['hooks/user-asks.mjs', 'hooks/idle-wake.mjs']; // the opt-in hooks too, so every hook is tried
    writeFileSync(lf, JSON.stringify(layout, null, 2));
    execFileSync('node', [CLI, 'update', '--dir', dir], { stdio: 'ignore' });
    put(join(dir, 'src/params/Params.h'), PARAMS('cutoff', 'res'));
    execFileSync('node', [join(dir, '.claude/hooks/param-id-lock.mjs'), '--init'], { cwd: dir, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: 'ignore' });
  });
  const installed = readdirSync(join(p.here, '.claude/hooks')).filter((f) => /\.(mjs|py)$/.test(f)).sort();
  assert.deepEqual(installed, Object.keys(CASES).sort(), 'every installed hook needs a worktree case here');
  const failed = [];
  for (const [hook, check] of Object.entries(CASES)) {
    try { check(p); } catch (e) { failed.push(`${hook}: ${e.message.split('\n')[0]}`); }
  }
  assert.deepEqual(failed, []);
});

test('version-pin-guard reads docs/versions.md from the worktree the pin is written in', () => {
  const { here, wt } = project(['audio-core'], (dir) => {
    put(join(dir, 'package.json'), '{"dependencies":{}}\n');
    put(join(dir, 'docs/versions.md'), '| name | latest | checked | source | used | decision |\n|---|---|---|---|---|---|\n');
  });
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(join(wt, 'docs/versions.md'), `${readFileSync(join(wt, 'docs/versions.md'), 'utf8')}| zod | 4.1.12 | ${today} | https://github.com/colinhacks/zod/releases | 4.1.12 | use |\n`);
  const pin = (file) => spawnSync('node', [PIN_GUARD], {
    input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: file, content: '{"dependencies":{"zod":"4.1.12"}}\n' } }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: here },
  }).status;
  assert.equal(pin(join(wt, 'package.json')), 0, 'the worktree has the fresh row');
  assert.equal(pin(join(here, 'package.json')), 2, 'main has no row');
});
