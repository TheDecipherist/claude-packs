// Agents work in git worktrees under .claude/worktrees/, while CLAUDE_PROJECT_DIR still points at the
// main checkout. Every hook must judge a worktree file against its own checkout (Stellix WB-41, WB-55:
// folder-law refused every new file in a worktree, and agents routed new code into unrelated files).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const PIN_GUARD = fileURLToPath(new URL('../global/hooks/version-pin-guard.mjs', import.meta.url));
const git = (cwd, ...a) => execFileSync('git', a, { cwd, stdio: 'ignore' });
const put = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };

// A real repo with the packs installed and committed, and one agent worktree under .claude/worktrees/.
function project(initArgs, before = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cpw-'));
  execFileSync('node', [CLI, 'init', ...initArgs, '--dir', dir], { encoding: 'utf8' });
  before(dir);
  git(dir, 'init', '-q');
  git(dir, 'add', '-A');
  git(dir, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init');
  git(dir, 'worktree', 'add', '-q', '.claude/worktrees/agent-x', '-b', 'work/x');
  return { here: dir, wt: join(dir, '.claude/worktrees/agent-x') };
}

const stellix = () => project(['audio-core', 'gpu-painter', 'stellix', '--profile', 'stellix'], (dir) => {
  for (const d of ['lib/app/src', 'lib/world/src', 'lib/engines/src', 'lib/painter/src']) mkdirSync(join(dir, d), { recursive: true });
  writeFileSync(join(dir, 'lib/app/src/keep.h'), '// keep\n');
});

// Hooks run the way Claude Code runs them: the main checkout's copy, CLAUDE_PROJECT_DIR = main.
// node runs a .mjs hook, python3 a .py one, as the settings entries do.
const fireAs = (here, hook, payload, env = {}) =>
  spawnSync(hook.endsWith('.py') ? 'python3' : 'node', [join(here, '.claude/hooks', hook)], { input: JSON.stringify(payload), env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: here, ...env }, encoding: 'utf8' });
const fire = (here, hook, file, content = '// new\n') => fireAs(here, hook, { tool_name: 'Write', tool_input: { file_path: file, content } }).status;
const bash = (here, hook, command) => fireAs(here, hook, { tool_name: 'Bash', tool_input: { command } }).status;

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

// One case per installed hook: the worktree file it must allow and the one it must refuse, judged
// from the worktree's own checkout. A hook added to the packs without a case here fails the test.
const CASES = {
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
  'protect-vendor.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'protect-vendor.mjs', join(wt, 'src/dsp/Svf.cpp')), 0);
    assert.equal(fire(here, 'protect-vendor.mjs', join(wt, 'third_party/lib/lib.h')), 2);
    // the copy tree (a layout folder of kind "copy"), by a tool and by the shell; its sanctioned tool gets through
    assert.equal(fire(here, 'protect-vendor.mjs', join(wt, 'src/engines/copied/Voice.h')), 2);
    assert.equal(bash(here, 'protect-vendor.mjs', `sed -i '' s/a/b/ ${join(wt, 'src/engines/copied/Voice.h')}`), 2);
    assert.equal(bash(here, 'protect-vendor.mjs', `python3 tools/copy_in.py ${join(wt, 'src/engines/copied/Voice.h')}`), 0);
    assert.equal(bash(here, 'protect-vendor.mjs', `sed -i '' s/a/b/ ${join(wt, 'src/engines/Own.h')}`), 0);
  },
  'build-guard.mjs': ({ here, wt }) => {
    assert.equal(bash(here, 'build-guard.mjs', `cd ${wt} && cmake --build build -j8`), 2, 'a build outside the queue');
    assert.equal(bash(here, 'build-guard.mjs', `cd ${wt} && buildq cmake --build build -j8`), 0);
  },
  'time-guard.mjs': ({ here, wt }) => {
    const pre = (command) => fireAs(here, 'time-guard.mjs', { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } }).status;
    const loop = (pattern) => ['until', '!', 'pgrep', '-f', pattern, '>/dev/null;', 'do', 'sleep', '5;', 'done'].join(' ');
    assert.equal(pre(`cd ${wt} && ${loop('"cmake --build"')}`), 2);
    assert.equal(pre(`cd ${wt} && ${loop("'[c]make --build'")}`), 0);
  },
  'tims-asks.mjs': ({ here, wt }) => {
    const t = join(wt, 'transcript.jsonl');
    writeFileSync(t, `${JSON.stringify({ type: 'user', timestamp: new Date().toISOString(), message: { content: 'make the bank louder' } })}\n`);
    const r = fireAs(here, 'tims-asks.mjs', { hook_event_name: 'SessionStart', source: 'compact', transcript_path: t }, { TIMS_ASKS_LEDGER: join(wt, 'ledger.json') });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /make the bank louder/);
  },
  'idle-wake.mjs': ({ here, wt }) => {
    const t = join(wt, 'transcript.jsonl');
    writeFileSync(t, '{}\n');
    const env = { IDLE_WAKE_MIN: '0.0005', IDLE_WAKE_LOOK_S: '0.01', TIMS_ASKS_LEDGER: join(wt, 'ledger.json') };
    assert.equal(fireAs(here, 'idle-wake.mjs', { hook_event_name: 'Stop', transcript_path: t, last_assistant_message: 'Next I would build P4.' }, env).status, 2);
    assert.equal(fireAs(here, 'idle-wake.mjs', { hook_event_name: 'Stop', transcript_path: t, last_assistant_message: 'All done. NOTHING OPEN' }, env).status, 0);
  },
  'browser-guard.py': ({ here, wt }) => {
    const launch = `import puppeteer from 'puppeteer';\nconst b = await puppeteer.${'launch'}();\n`;
    assert.equal(fire(here, 'browser-guard.py', join(wt, 'tools/shot.mjs'), launch), 2);
    assert.equal(fire(here, 'browser-guard.py', join(wt, 'src/painter/Draw.cpp'), 'void draw() {}\n'), 0);
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
  'no-shipped-images.mjs': ({ here, wt }) => {
    assert.equal(fire(here, 'no-shipped-images.mjs', join(wt, 'src/painter/logo.png')), 2);
    assert.equal(fire(here, 'no-shipped-images.mjs', join(wt, 'tests/goldens/panel.png')), 0);
    assert.equal(bash(here, 'no-shipped-images.mjs', `cp /tmp/a.png ${join(wt, 'src/app/logo.png')}`), 2);
  },
};

test('every hook judges a worktree file against the worktree, inside a real git worktree', () => {
  const p = project(['audio-core', 'gpu-painter', 'stellix'], (dir) => {
    const lf = join(dir, '.claude/layout.json');
    const layout = JSON.parse(readFileSync(lf, 'utf8'));
    layout.folders.engines_copy = { path: 'src/engines/copied', kind: 'copy', purpose: 'a copy tree' };
    layout.guards = { copy: { tools: ['tools/copy_in.py'] }, git: { refuseTrunk: true } };
    layout.enable = ['hooks/tims-asks.mjs', 'hooks/idle-wake.mjs']; // the opt-in hooks too, so every hook is tried
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
