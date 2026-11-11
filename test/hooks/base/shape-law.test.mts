// shape-law: an instance of a many concept is never a bare literal. The hook's contract, then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { readJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { write } from '../../fixtures/installs.mts';
import { assert, cli, hookRun, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
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
