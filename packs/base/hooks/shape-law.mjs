#!/usr/bin/env node
// PreToolUse (Write|Edit|MultiEdit|NotebookEdit|Bash): the shape law at write time, by every write route (lib/writes.mjs),
// in every folder; only design/shape.json "exclude" (generated files, vendored code) is left out. KWB-1: a hard-coded
// "slot 2" got past checks scoped to the engine folders. What a write may not ADD (what was there before is scan's job):
//   - an instance literal of a concept (lib/shape.mjs, the number rule): a pattern hit, a concept word with a number or an
//     ordinal, [N] on a per-instance array, `x == N` / `case N:` on a concept-named expression, a call that drives one
//     instance by number, a hand-listed set (one line per instance), a role name before a concept word ("the PAD slot");
//     allowed only as an example ("seen in:"), a listed selector, or a declared constant: "example, rule, or constant?";
//   - in a test (under test/, tests/, probes/, or named *test* / *_probe*): the same, read as a test that drives one
//     instance; the test loops over every instance or takes the instance as a parameter;
//   - a selector for a concept (pickSlot, slotFor, firstSlot, ownerSlot) not listed in the manifest;
//   - a new type that holds instances (an index member, or made N times in an array) whose concept has no row.
// No design/shape.json: nothing is declared, so nothing is judged (doctor fails a synth without one). `--selftest`.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkoutRoot, insideProject, relInCheckout, ROOT } from './lib/project.mjs';
import { addedFindings, findInstanceLiterals, formatFinding, isExcluded, isTestFile, logRefusal, readShape } from './lib/shape.mjs';
import { addedDefs, findSelectorDefs, findUnknownTypes } from './lib/shape-code.mjs';
import { bashOf, editOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { writesOf } from './lib/writes.mjs';

const TEST_NOTE = 'a test that drives one instance proves that instance only: loop over every instance, or take the instance as a parameter';

function judgeText(rel, before, after, shape) {
  const lits = addedFindings(before, after, (t) => findInstanceLiterals(t, rel, shape));
  const test = isTestFile(rel);
  const out = lits.map((f) => `${formatFinding(f, rel)}${test ? `\n      ${TEST_NOTE}` : ''}`);
  const concepts = lits.map((f) => f.concept);
  for (const d of [...addedDefs(before, after, (t) => findSelectorDefs(t, rel, shape)), ...addedDefs(before, after, (t) => findUnknownTypes(t, rel, shape))]) {
    out.push(formatFinding(d, rel));
    concepts.push(d.concept ?? 'new-type');
  }
  return { out, concepts };
}

function main() {
  let payload;
  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return 0; }
  for (const w of writesOf(payload, payload.cwd ?? process.cwd())) {
    if (w.after === null || w.op === 'delete' || !insideProject(w.path) || w.after.includes('\0')) continue;
    const root = checkoutRoot(w.path);
    const shape = readShape(root) ?? readShape(ROOT);
    if (!shape || shape.error) continue;
    const rel = relInCheckout(w.path);
    if (rel.startsWith('..') || isExcluded(rel, shape)) continue;
    const { out, concepts } = judgeText(rel, w.before, w.after, shape);
    if (!out.length) continue;
    logRefusal(ROOT, 'shape-law', concepts);
    process.stderr.write(`BLOCKED by shape-law: this write names one instance of a concept that design/shape.json declares (KWB-1).\n${out.slice(0, 10).map((l) => `  ${l}`).join('\n')}${out.length > 10 ? `\n  ... and ${out.length - 10} more` : ''}\n` +
      'Build for the shape: a loop over every instance or the generator; an instance seen in a bug goes on a "seen in:" line.\n');
    return 2;
  }
  return 0;
}

const SELFTEST_SHAPE = {
  concepts: {
    slot: {
      shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], patterns: ['\\bSlot::(amber|cyan|violet|green)\\b'],
      arrays: ['kSlotNames'], selectors: { selectedSlot: 'the slot the player has open', firstEmpty: 'the first slot with no sound' },
      constants: { initSlot: { instance: 1, reason: 'INIT plays one saw in slot 1' } },
    },
    mixer: { shape: 'one', id: 'mixer', words: ['mixer'] },
    planet: { shape: 'many', generator: 'planetId(kind, field)', words: ['planet', 'planets'], names: ['DELAY', 'FILTER'] },
  },
  exclude: ['build/**', 'third_party/**'],
  values: ['Cell'],
};

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const layout = { folders: { engines: { path: 'src/engines', purpose: 'engines' }, world: { path: 'src/world', purpose: 'world' }, ui: { path: 'src/ui', purpose: 'ui' }, tests: { path: 'tests', purpose: 'tests' }, docs: { path: 'docs', purpose: 'docs' } }, concepts: {} };
  const dir = scratchProject({ 'design/shape.json': JSON.stringify(SELFTEST_SHAPE), 'src/world/Old.cpp': 'void f() { if (slot == 2) g(); }\n// PLACE\n' }, layout);
  const bare = scratchProject({}, layout);
  const w = (rel, text, at = dir) => runHook(hook, at, writeOf(join(at, rel), text));
  const sh = (cmd) => runHook(hook, dir, bashOf(cmd, dir));
  const loop = 'for (int slot = 0; slot < kSlots; ++slot) set(slotId(slot, "reverb.mix"), v);\n';
  return verdicts('shape-law', [
    // planted: an engine file
    ['engine: slotIx == 1', w('src/engines/Voice.cpp', 'void f() { if (slotIx == 1) startCrew(); }\n'), 2],
    ['engine: slots[1]', w('src/engines/Voice.cpp', 'auto& s = slots[1];\n'), 2],
    ['engine: "slot2.reverb.mix"', w('src/engines/Bank.cpp', 'void f() { set("slot2.reverb.mix", v); }\n'), 2],
    ['engine: Slot::cyan (a manifest pattern)', w('src/engines/Bank.cpp', 'auto c = Slot::cyan;\n'), 2],
    ['engine: the one concept by number ("mixer2.bus")', w('src/engines/Bus.cpp', 'route("mixer2.bus");\n'), 2],
    // planted: a world file and a UI file
    ['world: s == 2 inside a loop over the slots', w('src/world/Space.cpp', 'for (int s = 0; s < kSlots; ++s) if (s == 2) addDelay(s);\n'), 2],
    ['world: case 2 in a switch on the slot', w('src/world/Space.cpp', 'switch (slot) {\ncase 2: addDelay(); break;\n}\n'), 2],
    ['ui: a hand-listed set, one line per slot', w('src/ui/Panel.cpp', 'slotGain.set(0, g);\nslotGain.set(1, g);\nslotGain.set(2, g);\nslotGain.set(3, g);\n'), 2],
    ['ui: "the PAD slot"', w('src/ui/Panel.cpp', '// the PAD slot gets the arp\n'), 2],
    ['ui: an unlisted name before a concept word ("the PAD planet", KWB-12)', w('src/ui/Panel.cpp', '// the PAD planet gets the arp\n'), 2],
    ['ui: kSlotNames[2]', w('src/ui/Panel.cpp', 'draw(kSlotNames[2]);\n'), 2],
    ['world: a selector not in the manifest', w('src/world/Pick.cpp', 'int pickSlot(int pad) {\n  return pad % 4;\n}\n'), 2],
    ['world: a new instance type with no row', w('src/world/Lane.h', 'struct Lane { int index; float gain; };\n'), 2],
    ['world: a value-like type not in "values" (KWB-10)', w('src/world/Tex.h', 'struct Tex { int index; float u; };\n'), 2],
    // planted: a test
    ['test: drives slot 2 only', w('tests/slot_test.cpp', 'TEST(Slots, Plays) { Engine e; e.playSlot(2); EXPECT_TRUE(e.sounding()); }\n'), 2],
    ['test: named for one instance', w('tests/play_test.cpp', 'TEST(Play, Slot2Sounds) { run(); }\n'), 2],
    // planted: a doc
    ['doc: "Drive slot 2"', w('docs/notes.md', 'Drive slot 2 with the pad.\n'), 2],
    ['doc: "the second slot"', w('docs/notes.md', 'The second slot holds the pad.\n'), 2],
    // a shell route
    ['bash heredoc: slotIx == 1', sh("cat > src/engines/Voice.cpp <<'EOF'\nif (slotIx == 1) go();\nEOF"), 2],
    ['bash sed -i adds a literal', sh("sed -i 's|// PLACE|if (slot == 3) h();|' src/world/Old.cpp"), 2],
    // the allowed forms
    ['allowed: the generator in a loop', w('src/engines/Bank.cpp', loop), 0],
    ['allowed: a test that loops over every slot', w('tests/slot_test.cpp', `TEST(Slots, Plays) {\n  ${loop}}\n`), 0],
    ['allowed: a seen in: line (doc)', w('docs/notes.md', 'seen in: slot 2, build for all slots\n'), 0],
    ['allowed: a seen in: comment (code)', w('src/world/Space.cpp', '// seen in: slot 3 had no delay (B-1); every slot gets one\nfor (int s = 0; s < kSlots; ++s) addDelay(s);\n'), 0],
    ['allowed: a listed selector', w('src/world/Pick.cpp', 'int selectedSlot() const {\n  return open;\n}\nif (selectedSlot == 1) x();\n'), 0],
    ['allowed: a declared constant', w('src/engines/Init.cpp', 'play(slotId(initSlot, "osc.wave")); // INIT: slot 1\n'), 0],
    ['allowed: a type listed in "values" (KWB-10)', w('src/world/Cell.h', 'struct Cell { int index; float x; };\n'), 0],
    ['allowed: a listed identity name ("the DELAY planet", KWB-12)', w('src/ui/Space.cpp', '// the DELAY planet sits by the FILTER planet\n'), 0],
    ['allowed: a type of a known concept', w('src/world/Card.h', 'struct SlotCard { int index; };\n'), 0],
    ['allowed: not instances (buffer[1], channel == 1)', w('src/engines/Mix.cpp', 'float s = buffer[1]; if (channel == 1) s = pos[0];\nif (slots == kSlots) full = true;\n'), 0],
    ['allowed: the whole range "slots 1-4"', w('docs/notes.md', 'Slots 1-4 all play every note.\n'), 0],
    ['allowed: a literal already there, untouched', runHook(hook, dir, editOf(join(dir, 'src/world/Old.cpp'), '// PLACE', '// nothing')), 0],
    ['allowed: excluded (build/)', w('build/gen/Table.cpp', 'auto& s = slots[1];\n'), 0],
    ['allowed: no design/shape.json', w('src/engines/Voice.cpp', 'if (slotIx == 1) go();\n', bare), 0],
    ['allowed: another project', runHook(hook, dir, writeOf(join(dirname(dir), 'elsewhere/src/x.cpp'), 'if (slotIx == 1) go();\n')), 0],
  ]);
}

process.exit(process.argv.includes('--selftest') ? selftest() : main());
