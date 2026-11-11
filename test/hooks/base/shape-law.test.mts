// shape-law: an instance of a many concept is never a bare literal. The hook's contract, then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { readJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { git, write } from '../../fixtures/installs.mts';
import { assert, cli, existsSync, fresh, hookRun, mkdirSync, readFileSync, rmSync, selftest, test, writeFileSync } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';
import { workProject, writeAt } from '../work-project.mts';

const LANE_SHAPE = { concepts: { lane: { shape: 'many', count: 8, generator: 'laneId(i)', words: ['lane', 'lanes'] } }, exclude: [] };

holdsTheContract({
  hook: 'shape-law.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    put(join(project, 'design/shape.json'), toJson(LANE_SHAPE));
    return { payload: write(join(project, 'src/core/Lanes.cpp'), 'if (laneIx == 3) go();\n'), status: 2 };
  },
});

// 1.1.0, group 2: false refusals. Every test here was seen red first (docs/1.1-progress.md). shape-law is held against the MPX 500's
// real refusals in test/fixtures/mpx-shape-refusals.json, both ways: what was marked wrong passes, and what was marked right stays refused.
interface MpxRefusal { id: string; verdict: 'wrong' | 'right'; changed?: string; lines: readonly (readonly [string, string])[] }
interface MpxFixture { manifest: unknown; declarations: Readonly<Record<string, string>>; refusals: readonly MpxRefusal[] }
const mpx = readJson<MpxFixture>(new URL('../../fixtures/mpx-shape-refusals.json', import.meta.url).pathname);
if (!mpx) throw new Error('test/fixtures/mpx-shape-refusals.json is not readable');
const FIXTURE: MpxFixture = mpx;
// The new-type and selector refusals need a whole file and an earlier manifest; the code that makes them is not changed here.
const typeOnly = (r: MpxRefusal): boolean => r.lines.every(([, text]) => /^(?:class|struct) |firstOfBank/.test(text));

/** A copy of the base install with the MPX 500's manifest and its declarations, on the branch the refusals were marked on. */
function unit(): string {
  const dir = workProject();
  put(join(dir, 'design/shape.json'), toJson(FIXTURE.manifest));
  for (const [rel, text] of Object.entries(FIXTURE.declarations)) put(join(dir, rel), text);
  return dir;
}
const refused = (dir: string, [rel, text]: readonly [string, string]): boolean => writeAt(dir, 'shape-law.mjs', rel, `${text}\n`).status === 2;
const shapeWrite = (dir: string, rel: string, text: string): number | null => writeAt(dir, 'shape-law.mjs', rel, text).status;

test('the fixture is the whole log: every row is marked wrong or right, with its id and its lines', () => {   // d-12: was "14 marked wrong, 15 marked right"
  assert.ok(FIXTURE.refusals.length > 0);
  for (const r of FIXTURE.refusals) {
    assert.match(r.id, /^[0-9a-f]{8}$/, 'an id');
    assert.ok(r.verdict === 'wrong' || r.verdict === 'right', `${r.id}: marked wrong or right`);
    assert.ok(r.lines.length > 0, `${r.id}: the lines it refused`);
  }
});

test('shape-law: every real refusal marked wrong passes', () => {
  const dir = unit();
  const still = FIXTURE.refusals.filter((r) => r.verdict === 'wrong').flatMap((r) => r.lines.filter((l) => refused(dir, l)).map(([, t]) => `${r.id}: ${t}`));
  assert.deepEqual(still, []);
});

test('shape-law: every real refusal marked right is still refused, on at least one of its lines', () => {
  const dir = unit();
  const held = FIXTURE.refusals.filter((r) => r.verdict === 'right' && !r.changed && !typeOnly(r));
  assert.ok(held.length > 0, 'rows are held');
  assert.deepEqual(held.filter((r) => !r.lines.some((l) => refused(dir, l))).map((r) => r.id), []);
});

test('shape-law: the two marks KF-36 overturns are the only right refusals that now pass, and each says why', () => {
  const changed = FIXTURE.refusals.filter((r) => r.changed);
  assert.deepEqual(changed.map((r) => r.id), ['d2c1b74b', '9612825c']);
  assert.ok(changed.every((r) => r.verdict === 'right' && r.changed?.includes('KF-36')));
});

test('KF-17: a count passed to a call is told from an instance by the declared parameter', () => {
  const dir = unit();
  assert.equal(shapeWrite(dir, 'tests/a.cpp', 'model.turnProgram (1, false);\n'), 0, 'declared (int steps, ...)');
  assert.equal(shapeWrite(dir, 'tests/a.cpp', 'model.turnEditKnob (1, 4);\n'), 2, 'declared (int knob, ...)');
  assert.equal(shapeWrite(dir, 'tests/a.cpp', 'model.turnProgramTwice (1, false);\n'), 2, 'nothing declares it');
});

test('KF-13, KF-20: a hex address and arithmetic are not instances; the bare forms are', () => {
  const dir = unit();
  const rows: readonly (readonly [string, number])[] = [['// Bank 0x18000 appears at window 0x8000\n', 0], ['// bank 0 is the factory one\n', 2], ['bool same = *each + 1 == program;\n', 0], ['bool same = 1 == program;\n', 2], ['if (program == 1) go();\n', 2]];
  for (const [text, want] of rows) assert.equal(shapeWrite(dir, 'src/a.cpp', text), want, text);
});

test('KF-17: a sentence in a string is text; a short key is not', () => {
  const dir = unit();
  assert.equal(shapeWrite(dir, 'tests/a.cpp', 'expect (done, "and on that bank\'s first program");\n'), 0);
  assert.equal(shapeWrite(dir, 'tests/a.cpp', 'set ("knob 1", 3);\n'), 2);
  assert.equal(shapeWrite(dir, 'docs/a.md', 'Move "knob 1" up and leave it there.\n'), 2, 'prose is not a string');
});

test('KF-17: first as a search or a part of something is English; the first of the concept is an instance', () => {
  const dir = unit();
  for (const text of ['// The first program with this name, or nothing.\n', '// each bank\'s first program lands here\n', '// the words "first program" were refused\n']) assert.equal(shapeWrite(dir, 'src/a.cpp', text), 0, text);
  for (const text of ['// The first program holds the delay.\n', '// The second program with this name\n']) assert.equal(shapeWrite(dir, 'src/a.cpp', text), 2, text);
});

test('KF-28: a role the machine gives, quoted from a source, stands; a number in a source note does not', () => {
  const dir = unit();
  assert.equal(shapeWrite(dir, 'tests/a.h', '/** [MAN] Edit knob 1 selects, Edit knob 3 changes. */\n'), 0);
  assert.equal(shapeWrite(dir, 'tests/a.h', '// [MAN] names run from bank 6 to bank 10.\n'), 2);
  assert.equal(shapeWrite(dir, 'tests/a.h', 'constexpr int selectKnob = 0;  // [MAN] Edit knob 1 in System Mode\n'), 2);
});

test('KF-36: a concept\'s own name or a listed selector is no role name; an unknown word is', () => {
  const dir = unit();
  assert.equal(shapeWrite(dir, 'docs/a.md', '| EDIT knob | 168 across |\n'), 0);
  assert.equal(shapeWrite(dir, 'docs/a.md', 'The PROGRAM knob has no pointer.\n'), 0);
  assert.equal(shapeWrite(dir, 'docs/a.md', 'The TRIM knob has a pointer.\n'), 2);
});

test('KF-20: a library\'s call and a longer proper name are not this project\'s instances', () => {
  const dir = unit();
  assert.equal(shapeWrite(dir, 'tests/a.cpp', 'auto m = juce::MidiMessage::programChange (1, change);\n'), 0);
  assert.equal(shapeWrite(dir, 'tests/a.cpp', 'auto m = mpx::programChange (1, change);\n'), 2);
  assert.equal(shapeWrite(dir, 'src/a.cpp', '// the row of MIDI Program Change\n'), 0);
  assert.equal(shapeWrite(dir, 'src/a.cpp', '// the MIDI Program gets it\n'), 2);
});

test('the shape ids is valid and judged by nothing; senses blank a word used another way (KWB-16, KWB-20)', () => {
  const dir = fixture('base');
  put(join(dir, 'design/shape.json'), toJson({ concepts: { patch: { shape: 'ids' }, band: { shape: 'many', count: 4, generator: 'bandId(i)', senses: ['first band'] } }, exclude: [] }));
  const r = cli(dir, 'shape', 'scan');
  assert.doesNotMatch(r.stdout + r.stderr, /shape must be/);
  const status = (content: string): number | null => hookRun(dir, 'shape-law.mjs', write(join(dir, 'src/a.cpp'), content)).status;
  assert.equal(status('// the first band of the third-octave measurement\n'), 0);
  assert.equal(status('// the second band\n'), 2);
});

// 0.9.0 (KWB-1): the shape law judges every folder, by every route.
const SLOT_SHAPE = JSON.stringify({ concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] });
test('shape-law refuses an instance literal by every route', () => {
  const dir = routeProject();
  writeFileSync(join(dir, 'design/shape.json'), SLOT_SHAPE);
  assert.deepEqual(unrefused(dir, 'shape-law.mjs', 'src/dsp/Mix.cpp', '// mix\nPLACEHOLDER\n', 'if (slotIx == 1) go();'), []);
});

// Identical containers by index, different things by ID (0.5.1; Stellix B-178: slot 2 hard-coded as special everywhere).
const SLOTS = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], arrays: ['kSlotNames'] } }, exclude: ['data/**'] };
const withSlots = (): string => {
  const dir = fixture('audio-core');
  writeFileSync(join(dir, 'design/shape.json'), JSON.stringify(SLOTS));
  return dir;
};
const shapeFired = (dir: string, rel: string, content: string): number | null => hookRun(dir, 'shape-law.mjs', write(join(dir, rel), content)).status;

// 0.9.0 (KWB-1): the engine-scoped checks no-instance-index-literal and no-instance-id-literal are retired; shape-law judges
// every folder against design/shape.json, so the world and UI code that let B-200 through are judged too.
test('the rule and shape-law install with every project; the engine-scoped instance checks are gone', () => {
  const dir = fixture('audio-core');
  assert.ok(existsSync(join(dir, '.claude/rules/instances-by-index-identities-by-id.md')));
  assert.ok(existsSync(join(dir, '.claude/hooks/shape-law.mjs')));
  assert.ok(!existsSync(join(dir, '.claude/checks/no-instance-index-literal.json')));
  assert.ok(!existsSync(join(dir, '.claude/checks/no-instance-id-literal.json')));
  const self = selftest(dir, 'shape-law.mjs');
  assert.equal(self.status, 0, self.stdout + self.stderr);
});

test('an instance index compared with a number, or an instance array indexed by one, is refused in code, in every folder', () => {
  const dir = withSlots();
  for (const rel of ['src/audio/Engine.cpp', 'src/world/Space.cpp', 'src/ui/Panel.cpp'])
    for (const bad of ['if (slotIx == 1) startCrew();', 'if (slot != 2) return;', 'auto& v = slots[3];', 'if (0 == slot) return;', 'mix += kSlotNames[1].size();'])
      assert.equal(shapeFired(dir, rel, `void f() { ${bad} }\n`), 2, `${rel}: ${bad}`);
});

test('not instances: buffer[1], channel == 1, pos[0], a loop to kSlots, a seen-in comment, all pass', () => {
  const dir = withSlots();
  for (const good of ['float s = buffer[1];', 'if (channel == 1) s = 0;', 'float x = pos[0];', 'for (int slot = 0; slot < kSlots; slot++) run(slot);',
    'auto& v = slots[slot];', '// seen in: slot 2 was special once (B-178)', 'if (slots == kSlots) full = true;'])
    assert.equal(shapeFired(dir, 'src/audio/Engine.cpp', good.startsWith('//') ? `${good}\nvoid f() {}\n` : `void f() { ${good} }\n`), 0, good);
  // a seen-in after code on the same line is no example: the code itself must be the loop or the generator
  assert.equal(shapeFired(dir, 'src/audio/Engine.cpp', 'void f() { if (slot == 2) g(); } // seen in: slot 2\n'), 2);
});

test('an instance ID written in a code string is refused; generated from the index, on a seen-in line or in excluded data, it passes', () => {
  const dir = withSlots();
  assert.equal(shapeFired(dir, 'src/audio/Bank.cpp', 'void f() { set("slot2.reverb.mix", v); }\n'), 2);
  assert.equal(shapeFired(dir, 'src/audio/Bank.cpp', 'void f() { set(slotId(slot, "reverb.mix"), v); }\n// seen in: "slot2.reverb.mix" is slotId(1, ...)\n'), 0);
  mkdirSync(join(dir, 'data'), { recursive: true });
  assert.equal(shapeFired(dir, 'data/bank.json', '{ "slot2.reverb.mix": 0.3 }\n'), 0);
});

// The shape law (0.9.0, KWB-1): design/shape.json per synth, doctor's checks on it, `shape scan`, and the law switched on in a
// project that already had the kit.
const SLOT = { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], selectors: { selectedSlot: 'the open slot' }, constants: { initSlot: { instance: 1, reason: 'INIT plays in it' } } };

test('new writes an empty design/shape.json and commits it; doctor passes', () => {
  const parent = fresh('cps-new-');
  const r = cli(parent, 'new', 'synth');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const dir = join(parent, 'synth');
  assert.deepEqual((JSON.parse(readFileSync(join(dir, 'design/shape.json'), 'utf8')) as { concepts: unknown }).concepts, {});
  assert.match(git(dir, 'ls-files'), /^design\/shape\.json$/m);
});

test('doctor fails a synth with no manifest, one that does not parse, and rows that break the contract', () => {
  const dir = fixture('audio-core');   // init writes the empty manifest
  const file = join(dir, 'design/shape.json');
  assert.ok(existsSync(file));
  rmSync(file);
  let r = cli(dir, 'doctor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /PROBLEM: no design\/shape\.json: a synth writes down/);
  writeFileSync(file, '{ "concepts": ');
  assert.match(cli(dir, 'doctor').stdout, /PROBLEM: design\/shape\.json does not parse/);
  writeFileSync(file, JSON.stringify({ concepts: { slot: { ...SLOT, generator: undefined, constants: { initSlot: { instance: 1 } } }, mixer: { shape: 'single' } }, exclude: [] }));
  r = cli(dir, 'doctor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /"slot": a many concept needs its generator/);
  assert.match(r.stdout, /"slot": constant initSlot has no reason/);
  assert.match(r.stdout, /"mixer": shape must be "one", "many" or "ids"/);
  writeFileSync(file, JSON.stringify({ concepts: { slot: SLOT }, exclude: [], values: 'Cell' }));
  assert.match(cli(dir, 'doctor').stdout, /"values" must be a list of type names/, 'KWB-10: values is a list');
  writeFileSync(file, JSON.stringify({ concepts: { slot: SLOT }, exclude: [], values: ['Cell', 3] }));
  assert.match(cli(dir, 'doctor').stdout, /"values" must be a list of type names/);
  writeFileSync(file, JSON.stringify({ concepts: { slot: { ...SLOT, names: 'DELAY' } }, exclude: [] }));
  assert.match(cli(dir, 'doctor').stdout, /"slot": names must be a list of identity names/, 'KWB-12: names is a list');
  writeFileSync(file, JSON.stringify({ concepts: { slot: SLOT, mixer: { shape: 'one', id: 'mixer' } }, exclude: [], values: ['Cell', 'Tex'] }));
  r = cli(dir, 'doctor');
  assert.doesNotMatch(r.stdout, /shape\.json/, r.stdout);
});

test('a project that is not a synth needs no manifest', () => {
  const dir = fresh('cps-gpu-');   // the install is the subject: a gpu-painter alone, not the synth fixture
  assert.equal(cli(dir, 'init', 'gpu-painter').status, 0);
  assert.ok(!existsSync(join(dir, 'design/shape.json')));
});

test('shape scan lists every finding by file and concept, with a count, in code, tests, docs and inbox briefs', () => {
  const dir = fresh('cps-scan-');
  const seed = (rel: string, text: string): void => { mkdirSync(join(dir, rel, '..'), { recursive: true }); writeFileSync(join(dir, rel), text); };
  seed('design/shape.json', JSON.stringify({ concepts: { slot: SLOT }, exclude: ['build/**'] }));
  seed('src/world/Space.cpp', 'void f() { if (slotIx == 1) go(); }\nfor (int s = 0; s < kSlots; ++s) run(s);\n');
  seed('tests/slot_test.cpp', 'TEST(S, P) { e.playSlot(2); }\n');
  seed('docs/spec.md', 'The PAD slot plays.\nseen in: slot 3, built for all slots\n');
  seed('inbox/brief-1.md', 'Drive slot 2.\n');
  seed('build/gen.cpp', 'slots[1];\n');
  let r = cli(dir, 'shape', 'scan');
  assert.equal(r.status, 1, r.stdout + r.stderr);
  for (const at of ['src/world/Space.cpp:1:', 'tests/slot_test.cpp:1:', 'docs/spec.md:1:', 'inbox/brief-1.md:1:']) assert.ok(r.stdout.includes(at), at);
  assert.doesNotMatch(r.stdout, /build\/gen\.cpp|docs\/spec\.md:2/);
  assert.match(r.stdout, /^slot: 4 finding\(s\) in 4 file\(s\)$/m);
  assert.match(r.stdout, /example, rule, or constant\?/);
  for (const f of ['src/world/Space.cpp', 'tests/slot_test.cpp', 'docs/spec.md', 'inbox/brief-1.md']) rmSync(join(dir, f));
  r = cli(dir, 'shape', 'scan');
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /no findings/);
});

test('the shape hooks are the law: on in a new install and switched on by update in a project that had the kit', () => {
  const dir = fixture('audio-core');
  const lockFile = join(dir, '.claude/claude-packs.lock.json');
  const lock = JSON.parse(readFileSync(lockFile, 'utf8')) as { files: Record<string, string> };
  for (const h of ['shape-law.mjs', 'brief-guard.mjs']) { delete lock.files[`.claude/hooks/${h}`]; rmSync(join(dir, '.claude/hooks', h)); }
  writeFileSync(lockFile, JSON.stringify(lock));
  interface Group { matcher?: string; hooks: { command: string }[] }
  const sf = join(dir, '.claude/settings.json');
  const before = JSON.parse(readFileSync(sf, 'utf8')) as { hooks: Record<string, Group[]> };
  for (const ev of Object.keys(before.hooks)) before.hooks[ev] = (before.hooks[ev] ?? []).map((g) => ({ ...g, hooks: g.hooks.filter((h) => !/shape-law|brief-guard/.test(h.command)) })).filter((g) => g.hooks.length);
  writeFileSync(sf, JSON.stringify(before));
  const r = cli(dir, 'update');
  assert.match(r.stdout, /switching on \(new to this project\): .*hooks\/brief-guard\.mjs/);
  assert.match(r.stdout, /switching on \(new to this project\): .*hooks\/shape-law\.mjs/);
  const s = readFileSync(join(dir, '.claude/settings.json'), 'utf8');
  assert.match(s, /hooks\/shape-law\.mjs/);
  const agent = (JSON.parse(s) as { hooks: { PreToolUse: Group[] } }).hooks.PreToolUse.find((g) => g.matcher === 'Agent|Task');
  assert.ok(agent?.hooks.some((h) => h.command.includes('brief-guard.mjs')), 'brief-guard reads every agent brief');
});
