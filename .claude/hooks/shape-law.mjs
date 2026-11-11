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
// No design/shape.json: nothing is declared, so nothing is judged (doctor fails a project of a configuration that needs one). `--selftest`.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkoutRoot, insideProject, relInCheckout } from './lib/project.mjs';
import { addedFindings, findInstanceLiterals, formatFinding, isExcluded, isTestFile, logRefusal, readShape } from './lib/shape.mjs';
import { addedDefs, findSelectorDefs, findUnknownTypes } from './lib/shape-code.mjs';
import { addressedOutside } from './lib/audience.mjs';
import { declaredAmount } from './lib/shape-prose.mjs';
import { bashOf, editOf, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { writesOf } from './lib/writes.mjs';
import { asHook, isMain, projectRoot } from './lib/hook-log.mjs';


const TEST_NOTE = 'a test that drives one instance proves that instance only: loop over every instance, or take the instance as a parameter';

function judgeText(rel, before, after, shape, root) {
  // a call that takes a count looks like one that takes an index; the declaration tells them apart (KF-17)
  const lits = addedFindings(before, after, (t) => findInstanceLiterals(t, rel, shape)).filter((f) => !(f.call && declaredAmount(root, f.call, after, process.env)));
  const test = isTestFile(rel);
  const out = lits.map((f) => `${formatFinding(f, rel)}${test ? `\n      ${TEST_NOTE}` : ''}`);
  const concepts = lits.map((f) => f.concept);
  for (const d of [...addedDefs(before, after, (t) => findSelectorDefs(t, rel, shape)), ...addedDefs(before, after, (t) => findUnknownTypes(t, rel, shape))]) {
    out.push(formatFinding(d, rel));
    concepts.push(d.concept ?? 'new-type');
  }
  return { out, concepts };
}

function main(text) {
  let payload;
  try { payload = JSON.parse(text); } catch { return 0; }
  for (const w of writesOf(payload, payload.cwd ?? process.cwd(), process.env)) {
    if (w.after === null || w.op === 'delete' || !insideProject(projectRoot(), w.path, process.cwd()) || w.after.includes('\0')) continue;
    const root = checkoutRoot(projectRoot(), w.path, process.cwd());
    const shape = readShape(root) ?? readShape(projectRoot());
    if (!shape || shape.error) continue;
    const rel = relInCheckout(projectRoot(), w.path, process.cwd());
    if (rel.startsWith('..') || isExcluded(rel, shape) || addressedOutside(rel, w.after)) continue;
    const { out, concepts } = judgeText(rel, w.before, w.after, shape, root);
    if (!out.length) continue;
    logRefusal(projectRoot(), 'shape-law', concepts);
    process.stderr.write(`BLOCKED by shape-law: this write names one instance of a concept that design/shape.json declares (KWB-1).\n${out.slice(0, 10).map((l) => `  ${l}`).join('\n')}${out.length > 10 ? `\n  ... and ${out.length - 10} more` : ''}\n` +
      'Build for the shape: a loop over every instance or the generator; an instance seen in a bug goes on a "seen in:" line.\n' +
      'A page for a person outside the project, about the real machine\'s own named controls (never a spec, brief or code), says so in its first 5 lines: <!-- audience: outside --> (.md or .txt only).\n');
    return 2;
  }
  return 0;
}

const SELFTEST_SHAPE = {
  concepts: {
    slot: {
      shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'], patterns: ['\\bSlot::(amber|cyan|violet|green)\\b'],
      arrays: ['kSlotNames'], selectors: { selectedSlot: 'the slot the player has open', firstEmpty: 'the first slot with nothing in it' },
      constants: { initSlot: { instance: 1, reason: 'INIT plays one saw in slot 1' } },
    },
    mixer: { shape: 'one', id: 'mixer', words: ['mixer'] },
    planet: { shape: 'many', generator: 'planetId(kind, field)', words: ['planet', 'planets'], names: ['DELAY', 'FILTER'] },
    padBank: { shape: 'many', count: 4, generator: 'padBankAt(i)', words: ['padBank', 'padBanks'] },
  },
  exclude: ['build/**', 'third_party/**'],
  values: ['Cell'],
};

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const layout = { folders: { engines: { path: 'src/engines', purpose: 'engines' }, world: { path: 'src/world', purpose: 'world' }, ui: { path: 'src/ui', purpose: 'ui' }, tests: { path: 'tests', purpose: 'tests' }, docs: { path: 'docs', purpose: 'docs' } }, concepts: {} };
  const dir = scratchProject({ 'design/shape.json': JSON.stringify(SELFTEST_SHAPE), 'src/world/Old.cpp': 'void f() { if (slot == 2) g(); }\n// PLACE\n' }, layout);
  const bare = scratchProject({}, layout);
  const w = (rel, text, at = dir) => runHook(hook, at, writeOf(join(at, rel), text)).status;
  const sh = (cmd) => runHook(hook, dir, bashOf(cmd, dir)).status;
  const loop = 'for (int slot = 0; slot < kSlots; ++slot) set(slotId(slot, "reverb.mix"), v);\n';
  return verdicts('shape-law', [
    // planted: an engine file
    ['engine: slotIx == 1', w('src/engines/Engine.cpp', 'void f() { if (slotIx == 1) startCrew(); }\n'), 2],
    ['engine: slots[1]', w('src/engines/Engine.cpp', 'auto& s = slots[1];\n'), 2],
    ['engine: "slot2.reverb.mix"', w('src/engines/Bank.cpp', 'void f() { set("slot2.reverb.mix", v); }\n'), 2],
    ['engine: Slot::cyan (a manifest pattern)', w('src/engines/Bank.cpp', 'auto c = Slot::cyan;\n'), 2],
    ['engine: the one concept by number ("mixer2.bus")', w('src/engines/Bus.cpp', 'route("mixer2.bus");\n'), 2],
    // planted: a world file and a UI file
    ['world: s == 2 inside a loop over the slots', w('src/world/Space.cpp', 'for (int s = 0; s < kSlots; ++s) if (s == 2) addDelay(s);\n'), 2],
    ['world: case 2 in a switch on the slot', w('src/world/Space.cpp', 'switch (slot) {\ncase 2: addDelay(); break;\n}\n'), 2],
    ['ui: a hand-listed set, one line per slot', w('src/ui/View.cpp', 'slotGain.set(0, g);\nslotGain.set(1, g);\nslotGain.set(2, g);\nslotGain.set(3, g);\n'), 2],
    ['ui: "the PAD slot"', w('src/ui/View.cpp', '// the PAD slot gets the arp\n'), 2],
    ['ui: an unlisted name before a concept word ("the PAD planet", KWB-12)', w('src/ui/View.cpp', '// the PAD planet gets the arp\n'), 2],
    ['ui: a caps concept word with no label before it, by number ("SLOTS 2", KWB-22)', w('src/ui/View.cpp', '// SLOTS 2 gets the arp\n'), 2],
    ['ui: kSlotNames[2]', w('src/ui/View.cpp', 'draw(kSlotNames[2]);\n'), 2],
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
    ['bash heredoc: slotIx == 1', sh("cat > src/engines/Engine.cpp <<'EOF'\nif (slotIx == 1) go();\nEOF"), 2],
    ['bash sed -i adds a literal', sh("sed -i 's|// PLACE|if (slot == 3) h();|' src/world/Old.cpp"), 2],
    // the allowed forms
    ['allowed: the generator in a loop', w('src/engines/Bank.cpp', loop), 0],
    ['allowed: a test that loops over every slot', w('tests/slot_test.cpp', `TEST(Slots, Plays) {\n  ${loop}}\n`), 0],
    ['allowed: a gate verdict before the word ("FAIL slot", KWB-15)', w('tools/gates/look.sh', 'for i in 0 1 2 3; do run "$i" || echo "FAIL slot $i"; done\n'), 0],
    ['allowed: a seen in: line (doc)', w('docs/notes.md', 'seen in: slot 2, build for all slots\n'), 0],
    ['allowed: a seen in: comment (code)', w('src/world/Space.cpp', '// seen in: slot 3 had no delay (B-1); every slot gets one\nfor (int s = 0; s < kSlots; ++s) addDelay(s);\n'), 0],
    ['allowed: a listed selector', w('src/world/Pick.cpp', 'int selectedSlot() const {\n  return open;\n}\nif (selectedSlot == 1) x();\n'), 0],
    ['allowed: an accessor for the one picker component (KWB-91)', w('src/ui/Frame.h', 'SlotPicker& slotPicker() noexcept { return picker; }\nSlotSelector& slotSelector() { return sel; }\n'), 0],
    ['allowed: a declared constant',w('src/engines/Init.cpp', 'play(slotId(initSlot, "osc.wave")); // INIT: slot 1\n'), 0],
    ['allowed: a type listed in "values" (KWB-10)', w('src/world/Cell.h', 'struct Cell { int index; float x; };\n'), 0],
    ['allowed: a listed identity name ("the DELAY planet", KWB-12)', w('src/ui/Space.cpp', '// the DELAY planet sits by the FILTER planet\n'), 0],
    ['allowed: a type of a known concept', w('src/world/Card.h', 'struct SlotCard { int index; };\n'), 0],
    ['allowed: not instances (buffer[1], channel == 1)', w('src/engines/Mix.cpp', 'float s = buffer[1]; if (channel == 1) s = pos[0];\nif (slots == kSlots) full = true;\n'), 0],
    ['allowed: a multi-word caps label\'s value ("AIM PLANETS 100", KWB-22)', w('src/ui/View.cpp', '// every planet off, AIM PLANETS 100: nothing heard\n'), 0],
    ['allowed: a multi-word caps label before the word ("a NOTES MONO slot", KWB-22)', w('src/engines/Engine.cpp', '// a NOTES MONO slot plays only its newest note\n'), 0],
    ['allowed: a number past the count is a value ("slot 40 ms", KWB-22)', w('docs/notes.md', 'Each slot 40 ms later than the last.\n'), 0],
    ['allowed: a hex address after the word (KF-13)', w('docs/notes.md', 'Slot 0x18000 appears at window 0x8000.\n'), 0],
    ['allowed: first as a search (KF-17)', w('src/world/Find.cpp', '// the first slot with this name, or nothing\n'), 0],
    ['allowed: a sentence in a string (KF-17)', w('tests/msg_test.cpp', 'expect (done, "and on that bank has a second slot");\n'), 0],
    ['allowed: a sum, not a compare (KF-20)', w('src/world/Sum.cpp', 'bool same = each + 1 == slot;\n'), 0],
    ['a short key in a string is still an instance (KF-17)', w('tests/key_test.cpp', 'set ("slot 2", 3);\n'), 2],
    ['the first of the concept is still an instance (KF-17)', w('docs/notes.md', 'The first slot holds the pad.\n'), 2],
    ['allowed: the whole range "slots 1-4"', w('docs/notes.md', 'Slots 1-4 all play every note.\n'), 0],
    ['allowed: a line already there, edited and moved (KWB-23)', runHook(hook, dir, editOf(join(dir, 'src/world/Old.cpp'), 'void f() { if (slot == 2) g(); }\n// PLACE', '// PLACE\nvoid f() { if (slot == 2) g(); } // closed: B-1')).status, 0],
    ['an edit adding a second copy of a literal already there (KWB-23)', runHook(hook, dir, editOf(join(dir, 'src/world/Old.cpp'), '// PLACE', 'void h() { if (slot == 2) g(); }')).status, 2],
    ['allowed: a literal already there, untouched', runHook(hook, dir, editOf(join(dir, 'src/world/Old.cpp'), '// PLACE', '// nothing')).status, 0],
    ['allowed: the type of a camelCase concept, made a count of times (KWB-93)', w('src/world/Bank.h', 'struct PadBank { int bankIndex; };\nstd::array<PadBank, kBanks> banks {};\n'), 0],
    ['a selector of a camelCase concept not listed (KWB-93)', w('src/world/Pick.cpp', 'int pickPadBank(int pad) {\n  return pad % 4;\n}\n'), 2],
    ['allowed: a type inside a string is a fixture, not a type (KWB-94)', w('src/ui/fixtures.mjs', "export const RAIL = 'struct Rail { int index; float gain; };';\n"), 0],
    // KWB-127: a page for a person outside the project, about the real machine's own named controls
    ['doc: addressed outside, marker in the first lines (KWB-127)', w('docs/sample-request.md', '<!-- audience: outside -->\n# Recording\nRoute LFO 1 to VCO1 FREQ at +20, slot 2 triangle.\n'), 0],
    ['doc: the same text with no marker is still refused (KWB-127)', w('docs/sample-request.md', '# Recording\nRoute LFO 1 to VCO1 FREQ at +20, slot 2 triangle.\n'), 2],
    ['doc: a marker below the first 5 lines exempts nothing (KWB-127)', w('docs/sample-request.md', '# Recording\n\n\n\n\n<!-- audience: outside -->\nslot 2 triangle.\n'), 2],
    ['code: the marker in a .cpp exempts nothing (KWB-127)', w('src/engines/Engine.cpp', '// <!-- audience: outside -->\nvoid f() { if (slotIx == 1) startCrew(); }\n'), 2],
    ['code: the marker in a .py exempts nothing (KWB-127)', w('tests/slot_test.py', '# <!-- audience: outside -->\nrun(slot[1])\n'), 2],
    ['code: a .md marker line in a .cpp first line exempts nothing (KWB-127)', w('src/engines/Bank.cpp', '<!-- audience: outside -->\nauto& s = slots[1];\n'), 2],
    ['allowed: excluded (build/)', w('build/gen/Table.cpp', 'auto& s = slots[1];\n'), 0],
    ['allowed: no design/shape.json', w('src/engines/Engine.cpp', 'if (slotIx == 1) go();\n', bare), 0],
    ['allowed: another project', runHook(hook, dir, writeOf(join(dirname(dir), 'elsewhere/src/x.cpp'), 'if (slotIx == 1) go();\n')).status, 0],
  ]);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('shape-law', main));
