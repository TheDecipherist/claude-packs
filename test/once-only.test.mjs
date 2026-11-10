// 0.9.0 items 6, 7 and 9: the making text's cost and the repo's duplicate count in doctor (a count that went up is a
// problem), `claude-packs dup scan` by file, and the three hooks wired where they fire.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../bin/claude-packs.mjs', import.meta.url));
const put = (file, text) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); };
const cli = (...a) => spawnSync('node', [CLI, ...a], { encoding: 'utf8' });
const FN = (name, k = '2.0f') => `float ${name}::process (float x) noexcept\n{\n    const float g = std::tan (kPi * cutoff / sampleRate);\n    const float k = ${k} - 2.0f * resonance;\n` +
  '    const float a1 = 1.0f / (1.0f + g * (g + k));\n    const float a2 = g * a1;\n    const float a3 = g * a2;\n    const float v3 = x - ic2eq;\n' +
  '    const float v1 = a1 * ic1eq + a2 * v3;\n    const float v2 = ic2eq + a2 * ic1eq + a3 * v3;\n    ic1eq = 2.0f * v1 - ic1eq;\n    ic2eq = 2.0f * v2 - ic2eq;\n    return v2;\n}\n';

function project() {
  const dir = mkdtempSync(join(tmpdir(), 'cpk3-'));
  execFileSync('node', [CLI, 'init', 'audio-core', '--dir', dir], { encoding: 'utf8' });
  return dir;
}

test('once-only, making and making-check are installed and wired where they fire', () => {
  const dir = project();
  const s = JSON.parse(readFileSync(join(dir, '.claude/settings.json'), 'utf8'));
  const runs = (event, hook, matcher) => (s.hooks[event] ?? []).some((g) => (matcher === undefined || g.matcher === matcher) && g.hooks.some((h) => h.command.includes(`.claude/hooks/${hook}`)));
  assert.ok(runs('PreToolUse', 'once-only.mjs', 'Write|Edit|MultiEdit|NotebookEdit|Bash'), 'once-only on the five write tools and the shell');
  assert.ok(runs('UserPromptSubmit', 'making.mjs'), 'making on every prompt');
  assert.ok(runs('Stop', 'making-check.mjs'), 'making-check when a turn ends');
});

test('doctor prints the making cost and the duplicate count; a count that went up is a problem', () => {
  const dir = project();
  put(join(dir, 'src/dsp/Svf.cpp'), `#include "Svf.h"\n\n${FN('Svf')}`);
  const first = cli('doctor', '--dir', dir);
  assert.match(first.stdout, /making: \d+ words, about \d+ tokens added to every prompt/);
  assert.match(first.stdout, /duplicates: 0 \(jscpd/);
  assert.equal(JSON.parse(readFileSync(join(dir, '.claude/state/duplicates.json'), 'utf8')).lowest, 0);
  put(join(dir, 'src/dsp/Copy.cpp'), `#include "Copy.h"\n\n${FN('Copy', '1.5f')}`);
  const second = cli('doctor', '--dir', dir);
  assert.match(second.stdout, /duplicates: 1 .*lowest seen 0/);
  assert.match(second.stdout, /PROBLEM: duplicates went up from 0 to 1/);
  assert.notEqual(second.status, 0);
});

test('dup scan lists every duplicate by file, both sides', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cpk3-scan-'));
  put(join(dir, 'src/a/Svf.cpp'), FN('Svf'));
  put(join(dir, 'src/b/Copy.cpp'), FN('Copy', '1.5f'));
  put(join(dir, 'out/Copy2.cpp'), FN('Copy2', '1.5f')); // build output is never judged
  const r = cli('dup', 'scan', '--dir', dir);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^src\/a\/Svf\.cpp\n {2}\d+-\d+ {2}same as src\/b\/Copy\.cpp:\d+-\d+/m);
  assert.match(r.stdout, /^src\/b\/Copy\.cpp\n {2}\d+-\d+ {2}same as src\/a\/Svf\.cpp/m);
  assert.match(r.stdout, /1 duplicate\(s\) in 2 file\(s\)/);
  assert.doesNotMatch(r.stdout, /out\/Copy2/);
});
