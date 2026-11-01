// WB-69: close the route, not just the brief. Every guard that refuses a write refuses it by EVERY tool that can
// write: Write, Edit, MultiEdit, NotebookEdit, and the shell (>, >>, tee, sed -i, cp, mv, a heredoc into a file).
// One test per guard tries each route against a file the guard must refuse; every route must be refused.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const PIN_GUARD = fileURLToPath(new URL('../global/hooks/version-pin-guard.mjs', import.meta.url));
const put = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
const sedSafe = (s) => s.replace(/[\\|&]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');

const ROUTES = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash >', 'Bash >>', 'Bash tee', 'Bash sed -i', 'Bash cp', 'Bash mv', 'Bash heredoc'];

// The payload of one route. The target holds `existing` (with the word PLACEHOLDER in it); a route that replaces
// the file writes `full` (existing with PLACEHOLDER replaced by `bad`), one that edits or appends adds `bad`.
function payload(route, target, existing, bad, scratch) {
  const full = existing.replace('PLACEHOLDER', bad);
  const src = join(scratch, `src-${route.replace(/\W/g, '')}.txt`);
  writeFileSync(src, route === 'Bash >>' ? bad : full);
  const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });
  switch (route) {
    case 'Write': return { tool_name: 'Write', tool_input: { file_path: target, content: full } };
    case 'Edit': return { tool_name: 'Edit', tool_input: { file_path: target, old_string: 'PLACEHOLDER', new_string: bad } };
    case 'MultiEdit': return { tool_name: 'MultiEdit', tool_input: { file_path: target, edits: [{ old_string: 'PLACEHOLDER', new_string: bad }] } };
    case 'NotebookEdit': return { tool_name: 'NotebookEdit', tool_input: { notebook_path: target, new_source: bad, edit_mode: 'insert' } };
    case 'Bash >': return bash(`cat '${src}' > '${target}'`);
    case 'Bash >>': return bash(`cat '${src}' >> '${target}'`);
    case 'Bash tee': return bash(`cat '${src}' | tee '${target}' > /dev/null`);
    case 'Bash sed -i': return bash(`sed -i 's|PLACEHOLDER|${sedSafe(bad)}|' '${target}'`);
    case 'Bash cp': return bash(`cp '${src}' '${target}'`);
    case 'Bash mv': return bash(`mv '${src}' '${target}'`);
    case 'Bash heredoc': return bash(`cat > '${target}' <<'EOF'\n${full}${full.endsWith('\n') ? '' : '\n'}EOF`);
    default: throw new Error(route);
  }
}

function project() {
  const dir = mkdtempSync(join(tmpdir(), 'cpr-'));
  execFileSync('node', [CLI, 'init', 'audio-core', 'gpu-painter', 'stellix', '--dir', dir], { encoding: 'utf8' });
  const lf = join(dir, '.claude/layout.json');
  const layout = JSON.parse(readFileSync(lf, 'utf8'));
  layout.folders.engines_copy = { path: 'src/engines/copied', kind: 'copy', purpose: 'a copy tree' };
  writeFileSync(lf, JSON.stringify(layout, null, 2));
  return dir;
}

// Fires `hook` once per route at `target`; returns the routes that were NOT refused.
function unrefused(dir, hook, rel, existing, bad, { routes = ROUTES, before = () => {}, run } = {}) {
  const scratch = mkdtempSync(join(tmpdir(), 'cpr-src-'));
  const target = join(dir, rel);
  const missed = [];
  for (const route of routes) {
    if (existing === null) put(join(dir, '.keep'), ''); else put(target, existing);
    before(target, (existing ?? 'PLACEHOLDER').replace('PLACEHOLDER', bad));
    const p = { ...payload(route, target, existing ?? 'PLACEHOLDER', bad, scratch), hook_event_name: 'PreToolUse', cwd: dir };
    const exe = run ?? join(dir, '.claude/hooks', hook);
    const r = spawnSync(exe.endsWith('.py') ? 'python3' : 'node', [exe], { cwd: dir, input: JSON.stringify(p), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', CLAUDE_PROJECT_DIR: dir } });
    if (r.status !== 2) missed.push(`${route} (exit ${r.status}${r.stderr ? `: ${r.stderr.split('\n')[0]}` : ''})`);
  }
  return missed;
}

const RT_BAD = 'void Voice::processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer& m) { auto* x = new float[64]; }';
const APVTS = 'void Filter::prepare (juce::AudioProcessorValueTreeState& apvts) { cutoff = apvts.getRawParameterValue ("cutoff"); }';
const LAUNCH = `const b = await puppeteer.${'launch'}();`;

// folder-law's law is about CREATING a file: the routes that can create one. An Edit, MultiEdit, NotebookEdit or
// sed -i of a file that is not there fails by itself (Sub37 WB-4's selftest: "an edit is never a new file").
test('folder-law refuses a new source file outside the layout by every route that creates a file', () => {
  const dir = project();
  const missed = unrefused(dir, 'folder-law.mjs', 'stray/New.cpp', null, 'int x;', {
    routes: ROUTES.filter((r) => !['Edit', 'MultiEdit', 'NotebookEdit', 'Bash sed -i'].includes(r)),
    before: (t) => { try { execFileSync('rm', ['-f', t]); } catch { /* not there */ } },
  });
  assert.deepEqual(missed, []);
});

test('placement-law refuses audio code added outside its folder by every route', () => {
  assert.deepEqual(unrefused(project(), 'placement-law.mjs', 'src/params/Helper.cpp', '// helper\nPLACEHOLDER\n', RT_BAD.replace('auto* x = new float[64];', '')), []);
});

test('protect-vendor refuses vendored code and a copy tree by every route', () => {
  const dir = project();
  assert.deepEqual(unrefused(dir, 'protect-vendor.mjs', 'third_party/lib/lib.h', 'PLACEHOLDER\n', 'int x;'), []);
  assert.deepEqual(unrefused(dir, 'protect-vendor.mjs', 'src/engines/copied/Voice.h', 'PLACEHOLDER\n', 'int x;'), []);
});

test('frozen-files refuses a frozen file by every route', () => {
  const dir = project();
  execFileSync('node', [join(dir, '.claude/tools/freeze.mjs'), 'on', 'bug 7', 'tests/**'], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: 'ignore' });
  assert.deepEqual(unrefused(dir, 'frozen-files.mjs', 'tests/bug_7_test.cpp', 'PLACEHOLDER\n', 'EXPECT (true);'), []);
});

test('spec-lock refuses a locked spec by every route', () => {
  const dir = project();
  execFileSync('node', [join(dir, '.claude/hooks/spec-lock.mjs'), 'lock', 'build running'], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: 'ignore' });
  assert.deepEqual(unrefused(dir, 'spec-lock.mjs', 'docs/synth-spec.md', '# Spec\nPLACEHOLDER\n', 'a new law'), []);
});

test('file-size-guard refuses growth past the limit by every route', () => {
  const at = `PLACEHOLDER\n${'int a;\n'.repeat(299)}`;
  assert.deepEqual(unrefused(project(), 'file-size-guard.mjs', 'src/dsp/Big.cpp', at, Array.from({ length: 10 }, (_, k) => `int b${k};`).join('\n')), []);
});

test('lesson-checks refuses a known bug brought back by every route', () => {
  assert.deepEqual(unrefused(project(), 'lesson-checks.mjs', 'src/dsp/Filter.cpp', '// filter\nPLACEHOLDER\n', APVTS), []);
});

test('realtime-guard refuses realtime-unsafe code by every route', () => {
  assert.deepEqual(unrefused(project(), 'realtime-guard.mjs', 'src/audio/Voice.cpp', '// voice\nPLACEHOLDER\n', RT_BAD), []);
});

test('no-shipped-images refuses an image in the code by every route', () => {
  assert.deepEqual(unrefused(project(), 'no-shipped-images.mjs', 'src/painter/logo.png', 'PLACEHOLDER\n', 'PNG'), []);
});

test('browser-guard refuses code that starts a browser by every route', () => {
  assert.deepEqual(unrefused(project(), 'browser-guard.py', 'tools/shot.mjs', '// shot\nPLACEHOLDER\n', LAUNCH), []);
});

// once-only (0.9.0): a copy of a function the repo has, one line changed, is refused by every route that writes it.
const SVF = (name, k = '2.0f') => `float ${name}::process (float x) noexcept\n{\n    const float g = std::tan (kPi * cutoff / sampleRate);\n    const float k = ${k} - 2.0f * resonance;\n` +
  '    const float a1 = 1.0f / (1.0f + g * (g + k));\n    const float a2 = g * a1;\n    const float a3 = g * a2;\n    const float v3 = x - ic2eq;\n' +
  '    const float v1 = a1 * ic1eq + a2 * v3;\n    const float v2 = ic2eq + a2 * ic1eq + a3 * v3;\n    ic1eq = 2.0f * v1 - ic1eq;\n    ic2eq = 2.0f * v2 - ic2eq;\n    return v2;\n}';
test('once-only refuses a near-copy of existing code by every route', () => {
  const dir = project();
  put(join(dir, 'src/dsp/Svf.cpp'), `#include "Svf.h"\n\n${SVF('Svf')}\n`);
  assert.deepEqual(unrefused(dir, 'once-only.mjs', 'src/dsp/Copy.cpp', '// copy\nPLACEHOLDER\n', SVF('Copy', '1.5f')), []);
});

// PostToolUse: the write has landed; every route that wrote an id file away is refused.
test('param-id-lock refuses a lost parameter id by every route', () => {
  const dir = project();
  const ids = (...x) => x.map((id) => `auto p_${id} = juce::ParameterID { "${id}", 1 };`).join('\n');
  put(join(dir, 'src/params/Params.h'), `${ids('cutoff', 'res')}\n`);
  execFileSync('node', [join(dir, '.claude/hooks/param-id-lock.mjs'), '--init'], { cwd: dir, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: 'ignore' });
  const missed = unrefused(dir, 'param-id-lock.mjs', 'src/params/Params.h', `${ids('cutoff')}\nPLACEHOLDER\n`, '// res gone', {
    before: (t, landed) => writeFileSync(t, landed), // the write already happened
  });
  assert.deepEqual(missed, []);
});

// version-pin-guard (global) judges dependency files; NotebookEdit cannot write one, so it has no route there.
test('version-pin-guard refuses an unchecked pin by every route that can write a dependency file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cpr-pin-'));
  put(join(dir, 'docs/versions.md'), '| name | latest | checked | source | used | decision |\n|---|---|---|---|---|---|\n');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  const missed = unrefused(dir, null, 'requirements.txt', 'numpy==2.3.1\nPLACEHOLDER\n', 'requests==2.32.5', {
    routes: ROUTES.filter((r) => r !== 'NotebookEdit'), run: PIN_GUARD,
  });
  assert.deepEqual(missed, []);
  // the Edit gap: a new_string is taken literally ($& and $1 are text, not a replacement pattern)
  put(join(dir, 'package.json'), '{"dependencies":{"a":"1"}}\n');
  const r = spawnSync('node', [PIN_GUARD], { input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: join(dir, 'package.json'), old_string: '"a":"1"', new_string: '"a":"1","b$&":"2"' } }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.match(r.stderr, /b\$& 2: no row/);
});

test('the shell route reader is one file: the global copy is the project copy', () => {
  const a = readFileSync(fileURLToPath(new URL('../packs/base/hooks/lib/shell-writes.mjs', import.meta.url)), 'utf8');
  const b = readFileSync(fileURLToPath(new URL('../global/hooks/lib/shell-writes.mjs', import.meta.url)), 'utf8');
  assert.equal(a, b);
});

// 0.9.0 (KWB-1): the shape law judges every folder, by every route.
const SHAPE = JSON.stringify({ concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] });
test('shape-law refuses an instance literal by every route', () => {
  const dir = project();
  writeFileSync(join(dir, 'design/shape.json'), SHAPE);
  assert.deepEqual(unrefused(dir, 'shape-law.mjs', 'src/dsp/Mix.cpp', '// mix\nPLACEHOLDER\n', 'if (slotIx == 1) go();'), []);
});

test('brief-guard refuses a doc that names an instance by every route, and an agent brief', () => {
  const dir = project();
  writeFileSync(join(dir, 'design/shape.json'), SHAPE);
  assert.deepEqual(unrefused(dir, 'brief-guard.mjs', 'docs/brief.md', '# Brief\nPLACEHOLDER\n', 'Drive slot 2 until it sounds.'), []);
  const r = spawnSync('node', [join(dir, '.claude/hooks/brief-guard.mjs')], { input: JSON.stringify({ tool_name: 'Agent', tool_input: { prompt: 'Drive slot 2.' } }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.equal(r.status, 2);
});
