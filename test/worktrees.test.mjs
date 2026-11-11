// Agents work in git worktrees under .claude/worktrees/, while CLAUDE_PROJECT_DIR still points at the
// main checkout. Every hook must judge a worktree file against its own checkout (Stellix WB-41, WB-55:
// folder-law refused every new file in a worktree, and agents routed new code into unrelated files).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { CLI, PIN_GUARD, bash, caseFrom, fire, fireAs, landFromWorktree, project, put, stellix } from './worktree-rig.mjs';
import { readJson } from '../packs/base/hooks/lib/json.mjs';
import { COMMAND_CASES } from './worktree-cases-commands.mjs';
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

// making, making-check (0.9.0): a manifest with one many concept.
const SHAPE = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] };

// One case per installed hook: the worktree file it must allow and the one it must refuse, judged
// from the worktree's own checkout. A hook added to the packs without a case here, in worktree-cases-commands.mjs (a base hook
// that judges a command by its checkout's layout) or in worktree-cases-packs.mjs (a hook a pack other than base adds) fails the test.
const CASES = {
  ...PACK_CASES,
  ...COMMAND_CASES,
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
  'file-size-guard.mjs': caseFrom('file-size-guard.mjs', (await import('../packs/base/hooks/file-size-guard.mjs')).worktreeCase),
  'placement-law.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'placement-law.mjs', join(wt, 'src/painter/shaders/glow.wgsl'), '@fragment fn fs() {}'), 0);
    assert.equal(fire(here, 'placement-law.mjs', join(wt, 'src/dsp/glow.wgsl'), '@fragment fn fs() {}'), 2);
  },
  'shape-law.mjs': caseFrom('shape-law.mjs', (await import('../packs/base/hooks/shape-law.mjs')).worktreeCase),
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
  // 1.8.0: a call in the worktree is that agent's heartbeat, written in the main checkout where the status reads it, never
  // into the worktree; a call in the main checkout is the lead's
  'heartbeat.mjs': ({ here, wt }) => {
    const beat = (name, root = here) => readJson(join(root, '.claude/logs/heartbeats', `${name}.json`));
    assert.equal(fireAs(here, 'heartbeat.mjs', { hook_event_name: 'PreToolUse', cwd: wt, tool_name: 'Edit', tool_input: { file_path: join(wt, 'src/x.cpp') } }).status, 0);
    assert.equal(beat('agent-x')?.tool, 'Edit');
    assert.equal(beat('agent-x', wt), null);
    assert.equal(fireAs(here, 'heartbeat.mjs', { hook_event_name: 'PostToolUse', cwd: here, tool_name: 'Read', tool_input: { file_path: join(here, 'CLAUDE.md') } }).status, 0);
    assert.equal(beat('lead')?.event, 'post');
  },
  'stage-guard.mjs': ({ here, wt }) => {
    assert.equal(bash(here, 'stage-guard.mjs', `git -C ${wt} add -A`), 2);
    assert.equal(bash(here, 'stage-guard.mjs', `git -C ${wt} add src/dsp/Svf.cpp`), 0);
  },
  'git-guard.mjs': caseFrom('git-guard.mjs', (await import('../packs/base/hooks/git-guard.mjs')).worktreeCase),
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
  'dispatch-once.mjs': caseFrom('dispatch-once.mjs', (await import('../packs/base/hooks/dispatch-once.mjs')).worktreeCase),
  'once-only.mjs': caseFrom('once-only.mjs', (await import('../packs/base/hooks/once-only.mjs')).worktreeCase),
  'once-only-index.mjs': caseFrom('once-only-index.mjs', (await import('../packs/base/hooks/once-only-index.mjs')).worktreeCase),
  'code-shape.mjs': caseFrom('code-shape.mjs', (await import('../packs/base/hooks/code-shape.mjs')).worktreeCase),
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

test('git-guard at Stop, fired from a worktree, refuses while its landing left the main checkout behind (KWB-96)', () => {
  const p = project(['audio-core'], (dir) => {
    const lf = join(dir, '.claude/layout.json');
    writeFileSync(lf, JSON.stringify({ ...JSON.parse(readFileSync(lf, 'utf8')), guards: { git: { house: true } } }, null, 2));
  });
  const trunk = landFromWorktree(p);
  const stop = () => fireAs(p.here, 'git-guard.mjs', { hook_event_name: 'Stop', cwd: p.wt, session_id: `wt-lag-${process.pid}` });
  const s = stop();
  assert.equal(s.status, 2, s.stderr);
  assert.ok(s.stderr.includes(`git -C ${p.here} merge --ff-only origin/${trunk}`), s.stderr);
  execFileSync('git', ['-C', p.here, 'merge', '-q', '--ff-only', `origin/${trunk}`]);
  assert.equal(stop().status, 0, 'fast-forwarded, the turn ends');
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
