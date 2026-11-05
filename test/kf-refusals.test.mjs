// 1.1.0, group 2: false refusals. Every test here was seen red first (docs/1.1-progress.md). shape-law is held against the MPX 500's real refusals in
// test/fixtures/mpx-shape-refusals.json, both ways: what was marked wrong passes, and what was marked right stays refused.
import { assert, cli, execFileSync, fresh, hookRun, join, lessonWrite, mkdirSync, readFileSync, run, test, writeFileSync } from './kit-cli.mjs';
import { conceptsIn, unknownConcepts } from '../packs/base/hooks/making-check.mjs';
import { writesOfTurn } from '../packs/base/hooks/lib/turn.mjs';
import { statementsOf } from '../packs/base/hooks/lib/code-shapes.mjs';
import { languageOf } from '../packs/base/hooks/lib/languages.mjs';

const put = (dir, rel, text) => { mkdirSync(join(dir, rel, '..'), { recursive: true }); writeFileSync(join(dir, rel), text); };
const git = (dir, ...a) => execFileSync('git', ['-c', 'user.email=t@l', '-c', 'user.name=t', ...a], { cwd: dir, stdio: 'pipe', encoding: 'utf8' });
function installed(...packs) {
  const dir = fresh('kfr-');
  git(dir, 'init', '-q', '--initial-branch', 'work/x');
  assert.equal(cli(dir, 'init', ...(packs.length ? packs : ['--config', 'base'])).status, 0);
  return dir;
}
const write = (dir, hook, rel, content) => hookRun(dir, hook, { hook_event_name: 'PreToolUse', cwd: dir, tool_name: 'Write', tool_input: { file_path: join(dir, rel), content } });
const bash = (dir, hook, command) => hookRun(dir, hook, { hook_event_name: 'PreToolUse', cwd: dir, tool_name: 'Bash', tool_input: { command } });

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/mpx-shape-refusals.json', import.meta.url), 'utf8'));
// The new-type and selector refusals need a whole file and an earlier manifest; the code that makes them is not changed here.
const typeOnly = (r) => r.lines.every(([, t]) => /^(?:class|struct) |firstOfBank/.test(t));
function unit() {
  const dir = installed();
  put(dir, 'design/shape.json', JSON.stringify(FIXTURE.manifest));
  for (const [rel, text] of Object.entries(FIXTURE.declarations)) put(dir, rel, text);
  return dir;
}
const refused = (dir, [rel, text]) => write(dir, 'shape-law.mjs', rel, `${text}\n`).status === 2;

test('the fixture is the whole log: 14 marked wrong, 15 marked right', () => {
  assert.equal(FIXTURE.refusals.filter((r) => r.verdict === 'wrong').length, 14);
  assert.equal(FIXTURE.refusals.filter((r) => r.verdict === 'right').length, 15);
});

test('shape-law: every real refusal marked wrong passes', () => {
  const dir = unit();
  const still = FIXTURE.refusals.filter((r) => r.verdict === 'wrong').flatMap((r) => r.lines.filter((l) => refused(dir, l)).map(([, t]) => `${r.id}: ${t}`));
  assert.deepEqual(still, []);
});

test('shape-law: every real refusal marked right is still refused, on at least one of its lines', () => {
  const dir = unit();
  const held = FIXTURE.refusals.filter((r) => r.verdict === 'right' && !r.changed && !typeOnly(r));
  assert.equal(held.length, 8);
  assert.deepEqual(held.filter((r) => !r.lines.some((l) => refused(dir, l))).map((r) => r.id), []);
});

test('shape-law: the two marks KF-36 overturns are the only right refusals that now pass, and each says why', () => {
  const changed = FIXTURE.refusals.filter((r) => r.changed);
  assert.deepEqual(changed.map((r) => r.id), ['d2c1b74b', '9612825c']);
  assert.ok(changed.every((r) => r.verdict === 'right' && r.changed.includes('KF-36')));
});

test('KF-17: a count passed to a call is told from an instance by the declared parameter', () => {
  const dir = unit();
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.cpp', 'model.turnProgram (1, false);\n').status, 0, 'declared (int steps, ...)');
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.cpp', 'model.turnEditKnob (1, 4);\n').status, 2, 'declared (int knob, ...)');
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.cpp', 'model.turnProgramTwice (1, false);\n').status, 2, 'nothing declares it');
});

test('KF-13, KF-20: a hex address and arithmetic are not instances; the bare forms are', () => {
  const dir = unit();
  for (const [text, want] of [['// Bank 0x18000 appears at window 0x8000\n', 0], ['// bank 0 is the factory one\n', 2], ['bool same = *each + 1 == program;\n', 0], ['bool same = 1 == program;\n', 2], ['if (program == 1) go();\n', 2]]) {
    assert.equal(write(dir, 'shape-law.mjs', 'src/a.cpp', text).status, want, text);
  }
});

test('KF-17: a sentence in a string is text; a short key is not', () => {
  const dir = unit();
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.cpp', 'expect (done, "and on that bank\'s first program");\n').status, 0);
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.cpp', 'set ("knob 1", 3);\n').status, 2);
  assert.equal(write(dir, 'shape-law.mjs', 'docs/a.md', 'Move "knob 1" up and leave it there.\n').status, 2, 'prose is not a string');
});

test('KF-17: first as a search or a part of something is English; the first of the concept is an instance', () => {
  const dir = unit();
  for (const text of ['// The first program with this name, or nothing.\n', '// each bank\'s first program lands here\n', '// the words "first program" were refused\n']) assert.equal(write(dir, 'shape-law.mjs', 'src/a.cpp', text).status, 0, text);
  for (const text of ['// The first program holds the delay.\n', '// The second program with this name\n']) assert.equal(write(dir, 'shape-law.mjs', 'src/a.cpp', text).status, 2, text);
});

test('KF-28: a role the machine gives, quoted from a source, stands; a number in a source note does not', () => {
  const dir = unit();
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.h', '/** [MAN] Edit knob 1 selects, Edit knob 3 changes. */\n').status, 0);
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.h', '// [MAN] names run from bank 6 to bank 10.\n').status, 2);
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.h', 'constexpr int selectKnob = 0;  // [MAN] Edit knob 1 in System Mode\n').status, 2);
});

test('KF-36: a concept\'s own name or a listed selector is no role name; an unknown word is', () => {
  const dir = unit();
  assert.equal(write(dir, 'shape-law.mjs', 'docs/a.md', '| EDIT knob | 168 across |\n').status, 0);
  assert.equal(write(dir, 'shape-law.mjs', 'docs/a.md', 'The PROGRAM knob has no pointer.\n').status, 0);
  assert.equal(write(dir, 'shape-law.mjs', 'docs/a.md', 'The TRIM knob has a pointer.\n').status, 2);
});

test('KF-20: a library\'s call and a longer proper name are not this project\'s instances', () => {
  const dir = unit();
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.cpp', 'auto m = juce::MidiMessage::programChange (1, change);\n').status, 0);
  assert.equal(write(dir, 'shape-law.mjs', 'tests/a.cpp', 'auto m = mpx::programChange (1, change);\n').status, 2);
  assert.equal(write(dir, 'shape-law.mjs', 'src/a.cpp', '// the row of MIDI Program Change\n').status, 0);
  assert.equal(write(dir, 'shape-law.mjs', 'src/a.cpp', '// the MIDI Program gets it\n').status, 2);
});

const MANIFEST = { concepts: { editPage: { shape: 'many', generator: 'pagesOf(p)', words: ['editPage', 'editPages'] }, paramSlot: { shape: 'many', generator: 'slotId(i)', words: ['paramSlot', 'paramSlots'] }, program: { shape: 'many', generator: 'programAt(i)' } } };

test('KF-19, KF-39: a making line that names a camelCase concept names it, by row or by word', () => {
  assert.deepEqual([...conceptsIn('concepts: editPage, many; paramSlot (many)', MANIFEST)].sort(), ['editPage', 'paramSlot']);
  assert.deepEqual([...conceptsIn('the editPages array', MANIFEST)], ['editPage']);
  assert.deepEqual([...conceptsIn('an edit of the page', MANIFEST)], [], 'the two words apart are not the concept');
});

test('KF-24: the shape word after a concept is no concept, and a second list after ; is read', () => {
  assert.deepEqual(unknownConcepts('making: x; concepts: editPage, many; paramSlot, many; reuse: y', MANIFEST), []);
  assert.deepEqual(unknownConcepts('making: x; concepts: program, one; widget, many; reuse: y', MANIFEST), ['widget']);
});

const use = (name, input) => ({ name, input, cwd: '/p' });

test('KF-34: what a turn landed is over: only the writes after its last landing are this step\'s', () => {
  const turn = { uses: [use('Write', { file_path: '/p/tools/a.py', content: 'x' }), use('Bash', { command: 'git merge --ff-only work/x 2>&1 | tail -1' }), use('Write', { file_path: '/p/tools/b.py', content: 'y' })] };
  assert.deepEqual(writesOfTurn(turn, '/p').map((w) => w.path), ['/p/tools/b.py']);
  assert.deepEqual(writesOfTurn({ uses: turn.uses.slice(0, 2) }, '/p'), []);
  assert.deepEqual(writesOfTurn({ uses: [turn.uses[0], use('Bash', { command: "git commit -m 'merge --ff-only'" })] }, '/p').map((w) => w.path), ['/p/tools/a.py'], 'words about a merge land nothing');
});

const event = (dir, transcript) => ({ hook_event_name: 'Stop', session_id: `s${Math.random()}`, cwd: dir, transcript_path: transcript });
const line = (o) => `${JSON.stringify(o)}\n`;
const FN = (name) => `float ${name} (float x)\n{\n${Array.from({ length: 24 }, (_, i) => `    const float v${i} = x * ${i}.5f + std::tan (x / ${i + 2}.0f);\n`).join('')}    return x;\n}\n`;

test('KF-33: a write once-only already judged is not judged again at Stop; a shell write still is', () => {
  const dir = installed();
  put(dir, 'design/shape.json', '{"concepts":{}}\n');
  put(dir, 'build.md', '# b\n\n## In progress\n\n- x (work/x). making: a; concepts: none; reuse: none\n\n## Steps\n');
  put(dir, 'src/a.cpp', FN('first'));
  git(dir, 'add', 'src/a.cpp', 'build.md', 'design/shape.json');
  git(dir, 'commit', '-qm', 'x');
  put(dir, 'src/b.cpp', FN('second'));
  const transcript = (name, input) => { const f = join(dir, 'turn.jsonl'); writeFileSync(f, line({ type: 'user', message: { role: 'user', content: 'go' } }) + line({ type: 'assistant', cwd: dir, message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name, input }] } })); return f; };
  assert.equal(hookRun(dir, 'making-check.mjs', event(dir, transcript('Write', { file_path: join(dir, 'src/b.cpp'), content: FN('second') }))).status, 0);
  assert.equal(hookRun(dir, 'making-check.mjs', event(dir, transcript('Bash', { command: 'cp src/a.cpp src/b.cpp' }))).status, 2);
});

test('KF-14: a Python brace is data, not a statement end', () => {
  const py = languageOf('.py');
  const on = (text) => statementsOf(text, py).filter((s) => s.line === 1).length;
  assert.equal(on('used = {row.kind for row in rows if row.kind}\n'), 1);
  assert.equal(on('table = {"a": f(1), "b": g(2)}\n'), 1);
  const dir = installed();
  assert.equal(write(dir, 'code-shape.mjs', 'tools/a.py', 'kinds = {row.kind for row in table(rows) if keep(row)}\nprint(kinds)\n').status, 0);
  assert.equal(write(dir, 'code-shape.mjs', 'tools/b.py', 'a = f(1); b = g(2); c = h(3)\n').status, 2);
});

test('KF-27: a one-statement lambda counts the same in a list as in a call', () => {
  const cpp = languageOf('.cpp');
  const text = 'void f()\n{\n    judge ("signal", base, [&] { return timeProgram (*engine, plan, blocks, 0.25f); }),\n    judge ("silence", base, [&] { return timeProgram (*engine, plan, blocks, 0.0f); }),\n}\n';
  const on = (n) => statementsOf(text, cpp).filter((s) => s.line === n).length;
  assert.equal(on(3), 2);
  assert.equal(on(4), 2);
  const dir = installed();
  assert.equal(write(dir, 'code-shape.mjs', 'src/a.cpp', text).status, 0);
  assert.equal(write(dir, 'code-shape.mjs', 'src/b.cpp', 'void f()\n{\n    a(); b(); c();\n}\n').status, 2);
});

test('code-shape reports every line at fault at once, so one resend answers them all', () => {
  const dir = installed();
  const wide = `    int x = ${'value + '.repeat(40)}1;\n`;
  const r = write(dir, 'code-shape.mjs', 'src/a.cpp', `void f()\n{\n${wide}    ok();\n${wide}    a(); b(); c();\n}\n`);
  assert.equal(r.status, 2);
  for (const n of [3, 5]) assert.match(r.stderr, new RegExp(`line ${n} is \\d+ columns`));
  assert.match(r.stderr, /line 6 holds 3 statements/);
});

test('KF-10: a dry run stages nothing, in both hooks', () => {
  const dir = installed('audio-core');
  for (const hook of ['git-guard.mjs', 'stage-guard.mjs']) {
    for (const command of ['git add -n .', 'git add --dry-run -A']) assert.equal(bash(dir, hook, command).status, 0, `${hook}: ${command}`);
    assert.equal(bash(dir, hook, 'git add .').status, 2, hook);
  }
});

test('KF-21: --theirs during a merge resolves it; outside a merge it is an undo', () => {
  const dir = installed();
  put(dir, 'a.txt', 'base\n');
  git(dir, 'add', 'a.txt');
  git(dir, 'commit', '-qm', 'base', '--', 'a.txt');
  git(dir, 'switch', '-qc', 'other');
  put(dir, 'a.txt', 'other\n');
  git(dir, 'commit', '-qm', 'other', '--', 'a.txt');
  git(dir, 'switch', '-q', 'work/x');
  put(dir, 'a.txt', 'mine\n');
  git(dir, 'commit', '-qm', 'mine', '--', 'a.txt');
  put(dir, 'b.txt', 'uncommitted\n');
  assert.equal(bash(dir, 'git-guard.mjs', 'git checkout --theirs a.txt').status, 2, 'no merge: an undo');
  try { git(dir, 'merge', '-q', 'other'); } catch { /* the conflict is the point */ }
  assert.equal(bash(dir, 'git-guard.mjs', 'git checkout --theirs a.txt').status, 0);
  assert.equal(bash(dir, 'git-guard.mjs', 'git checkout --ours a.txt').status, 0);
  assert.equal(bash(dir, 'git-guard.mjs', 'git checkout -- a.txt').status, 2, 'a plain checkout is still an undo');
});

test('git rev-parse x^{commit} is no commit: the word in an argument is not the subcommand', () => {
  const dir = installed();
  const f = join(dir, '.claude/layout.json');
  writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, 'utf8')), guards: { git: { house: true, ghAuth: 'cli', refuseTrunk: true } } }));
  put(dir, 'a.txt', 'x\n');
  git(dir, 'add', 'a.txt');
  git(dir, 'commit', '-qm', 'x', '--', 'a.txt');
  git(dir, 'branch', '-qm', 'main');
  assert.equal(bash(dir, 'git-guard.mjs', 'git rev-parse HEAD^{commit}').status, 0);
  assert.equal(bash(dir, 'git-guard.mjs', 'git log --grep commit').status, 0);
  assert.equal(bash(dir, 'git-guard.mjs', 'git -C . commit -m x -- a.txt').status, 2);
});

test('KF-25: a test\'s stub may advance its play head; the code may not', () => {
  const dir = installed('audio-core', 'midi');
  const stub = 'head.ppq += head.bpm / 60.0 * unitBlock / unitRate;\n';
  assert.equal(lessonWrite(dir, 'tests/unit_harness.h', stub).status, 0);
  assert.equal(lessonWrite(dir, 'src/audio/Transport.cpp', stub).status, 2);
});

test('KF-26: a filter is no search: it needs a return or break on the match', () => {
  const dir = installed('cpp');
  const body = (loop) => `void f()\n{\n    ${loop}\n}\n`;
  assert.equal(lessonWrite(dir, 'src/a.cpp', body('for (const auto& target : targets) if (target.kind == none) continue;')).status, 0);
  assert.equal(lessonWrite(dir, 'src/a.cpp', body('for (const auto& c : controls) if (c.id == id) return &c;')).status, 2);
  assert.equal(lessonWrite(dir, 'src/a.cpp', body('for (const auto& c : controls) { if (c.id == id) { found = &c; break; } }')).status, 2);
});

const USINGS = `${Array.from({ length: 12 }, (_, i) => `using mpx::harness::name${i};\n`).join('')}constexpr double unitRate = 48000.0;\n`;

test('KF-32: a block of using declarations is no copy; code after it still is', () => {
  const dir = installed();
  put(dir, 'tests/a.cpp', `#include "h.h"\n\n${USINGS}\nint main() { return first (); }\n`);
  git(dir, 'add', 'tests/a.cpp');
  git(dir, 'commit', '-qm', 'a', '--', 'tests/a.cpp');
  assert.equal(write(dir, 'once-only.mjs', 'tests/b.cpp', `#include "h.h"\n\n${USINGS}\nint main() { return second (); }\n`).status, 0);
  const code = FN('kept');
  put(dir, 'tests/c.cpp', `${USINGS}\n${code}`);
  git(dir, 'add', 'tests/c.cpp');
  git(dir, 'commit', '-qm', 'c', '--', 'tests/c.cpp');
  assert.equal(write(dir, 'once-only.mjs', 'tests/d.cpp', `${USINGS}\n${code}`).status, 2);
});

const SWITCH = (expr, ...labels) => `void f()\n{\n    switch (${expr})\n    {\n${labels.map((l) => `        case ${l}: run (); break;\n`).join('')}    }\n}\n`;

test('KF-35: a switch on another type\'s kind is another kind, told by its cases', () => {
  const dir = installed();
  put(dir, 'src/Engine.cpp', SWITCH('block.kind', 'BlockKind::delay', 'BlockKind::reverb'));
  assert.equal(write(dir, 'dispatch-once.mjs', 'src/Glyph.cpp', SWITCH('step.kind', 'StepKind::line', 'StepKind::curve')).status, 0);
  assert.equal(write(dir, 'dispatch-once.mjs', 'src/Other.cpp', SWITCH('other.kind', 'BlockKind::delay', 'BlockKind::chorus')).status, 2, 'one case shared: the same kind');
  assert.equal(write(dir, 'dispatch-once.mjs', 'src/Plain.cpp', 'void g()\n{\n    switch (block.kind) { default: break; }\n}\n').status, 2, 'no case to read: the name decides, as before');
});

test('KF-35: two switches on one kind in one new file are refused, with a true reason', () => {
  const dir = installed();
  const r = write(dir, 'dispatch-once.mjs', 'src/Glyph.cpp', `${SWITCH('step.kind', 'StepKind::line', 'StepKind::curve')}${SWITCH('step.kind', 'StepKind::line', 'StepKind::curve').replace('void f', 'void g')}`);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /twice in this file/);
});

test('KF-2: protect-vendor\'s refusal names the setting that answers it', () => {
  const dir = installed('audio-core');
  const r = write(dir, 'protect-vendor.mjs', 'build/evidence/R0/update.txt', 'x\n');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /"buildOutput"/);
  run(dir, 'doctor', '--fresh');
});
