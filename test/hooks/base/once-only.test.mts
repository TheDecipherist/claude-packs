// once-only: a write that repeats code the repo already has is refused. The hook's contract, then its refusals.
import { join } from 'node:path';
import { git, write } from '../../fixtures/installs.mts';
import { assert, cli, put, readFileSync, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readHookTable } from '../../../packs/base/hooks/lib/hook-table.mts';
import { cppFunction, workProject, writeAt } from '../work-project.mts';

holdsTheContract({
  hook: 'once-only.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: write(join(project, 'src/core/Rec.cpp')), status: 0 }),
});

const USINGS = `${Array.from({ length: 12 }, (_, i) => `using mpx::harness::name${i};\n`).join('')}constexpr double unitRate = 48000.0;\n`;

test('KF-32: a block of using declarations is no copy; code after it still is', () => {
  const dir = workProject();
  put(join(dir, 'tests/a.cpp'), `#include "h.h"\n\n${USINGS}\nint main() { return first (); }\n`);
  git(dir, 'add', 'tests/a.cpp');
  git(dir, 'commit', '-qm', 'a', '--', 'tests/a.cpp');
  assert.equal(writeAt(dir, 'once-only.mjs', 'tests/b.cpp', `#include "h.h"\n\n${USINGS}\nint main() { return second (); }\n`).status, 0);
  const code = cppFunction('kept');
  put(join(dir, 'tests/c.cpp'), `${USINGS}\n${code}`);
  git(dir, 'add', 'tests/c.cpp');
  git(dir, 'commit', '-qm', 'c', '--', 'tests/c.cpp');
  assert.equal(writeAt(dir, 'once-only.mjs', 'tests/d.cpp', `${USINGS}\n${code}`).status, 2);
});

// 0.9.0: a copy of a function the repo has, one line changed, is refused by every route that writes it.
const SVF = (name: string, k = '2.0f'): string => `float ${name}::process (float x) noexcept\n{\n    const float g = std::tan (kPi * cutoff / sampleRate);\n    const float k = ${k} - 2.0f * resonance;\n` +
  '    const float a1 = 1.0f / (1.0f + g * (g + k));\n    const float a2 = g * a1;\n    const float a3 = g * a2;\n    const float v3 = x - ic2eq;\n' +
  '    const float v1 = a1 * ic1eq + a2 * v3;\n    const float v2 = ic2eq + a2 * ic1eq + a3 * v3;\n    ic1eq = 2.0f * v1 - ic1eq;\n    ic2eq = 2.0f * v2 - ic2eq;\n    return v2;\n}\n';

test('once-only refuses a near-copy of existing code by every route', () => {
  const dir = routeProject();
  put(join(dir, 'src/dsp/Svf.cpp'), `#include "Svf.h"\n\n${SVF('Svf').trimEnd()}\n`);
  assert.deepEqual(unrefused(dir, 'once-only.mjs', 'src/dsp/Copy.cpp', '// copy\nPLACEHOLDER\n', SVF('Copy', '1.5f').trimEnd()), []);
});

// 0.9.0 items 6, 7 and 9: the making text's cost and the repo's duplicate count in doctor (a count that went up is a problem),
// `claude-packs dup scan` by file, and the three hooks wired where they fire.
test('once-only, making and making-check are installed and wired where they fire', () => {
  const dir = fixture('audio-core');
  const table = readHookTable(join(dir, '.claude/hooks')) ?? [];   // the rows the runner reads (W8.1)
  const runs = (event: string, hook: string, matcher?: string): boolean =>
    table.some((r) => r.hook === hook && r.events.some((e) => e === event) && (matcher === undefined || r.matcher === matcher));
  assert.ok(runs('PreToolUse', 'once-only', 'Write|Edit|MultiEdit|NotebookEdit|Bash'), 'once-only on the five write tools and the shell');
  assert.ok(runs('UserPromptSubmit', 'making'), 'making on every prompt');
  assert.ok(runs('Stop', 'making-check'), 'making-check when a turn ends');
});

test('doctor prints the making cost and the duplicate count; a count that went up is a problem', () => {
  const dir = fixture('audio-core');
  put(join(dir, 'src/dsp/Svf.cpp'), `#include "Svf.h"\n\n${SVF('Svf')}`);
  const first = cli(dir, 'doctor');
  assert.match(first.stdout, /making: \d+ words, about \d+ tokens added to every prompt/);
  assert.match(first.stdout, /duplicates: 0 \(jscpd/);
  assert.equal((JSON.parse(readFileSync(join(dir, '.claude/state/duplicates.json'), 'utf8')) as { lowest: number }).lowest, 0);
  put(join(dir, 'src/dsp/Copy.cpp'), `#include "Copy.h"\n\n${SVF('Copy', '1.5f')}`);
  const second = cli(dir, 'doctor');
  assert.match(second.stdout, /duplicates: 1 .*lowest seen 0/);
  assert.match(second.stdout, /PROBLEM: duplicates went up from 0 to 1/);
  assert.notEqual(second.status, 0);
});

test('dup scan lists every duplicate by file, both sides', () => {
  const dir = scratchDir('cpk3-scan-');
  put(join(dir, 'src/a/Svf.cpp'), SVF('Svf'));
  put(join(dir, 'src/b/Copy.cpp'), SVF('Copy', '1.5f'));
  put(join(dir, 'out/Copy2.cpp'), SVF('Copy2', '1.5f')); // build output is never judged
  const r = cli(dir, 'dup', 'scan');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^src\/a\/Svf\.cpp\n {2}\d+-\d+ {2}same as src\/b\/Copy\.cpp:\d+-\d+/m);
  assert.match(r.stdout, /^src\/b\/Copy\.cpp\n {2}\d+-\d+ {2}same as src\/a\/Svf\.cpp/m);
  assert.match(r.stdout, /1 duplicate\(s\) in 2 file\(s\)/);
  assert.doesNotMatch(r.stdout, /out\/Copy2/);
});
