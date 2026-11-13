// The reverse-engineering pack's rules and skills, with no hook of its own: reproduction or original decides the aliasing law, and a
// circuit diagram is read tile by tile. (What the kit finds of such a project: test/hooks/base/base-pack.test.mts.)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { KIT } from '../../kit-cli.mts';

test('reproduction or original decides the aliasing law', () => {
  const rule = readFileSync(join(KIT, 'packs/audio-core/rules/oscillators-bandlimited.md'), 'utf8');
  assert.match(rule, /guards\.instrument\.kind/);
  assert.match(readFileSync(join(KIT, 'packs/reverse-engineering/rules/reproduction-or-original.md'), 'utf8'), /"kind": "reproduction"/);
});

test('a circuit diagram is read tile by tile, one report an image, and set against the code', () => {
  const skill = readFileSync(join(KIT, 'packs/reverse-engineering/skills/read-a-circuit-diagram/SKILL.md'), 'utf8');
  assert.ok(skill.length < 8000);
  assert.match(skill, /^description: Use when/m);
  for (const law of [/One image, one report/, /overlapping tiles/, /Mermaid `flowchart`/, /chips\/<part>\.md/, /SPICE netlist for every analog stage/, /ngspice -b/, /lacks a curve a model needs/, /a pin-compatible copy/, /never as the original's/, /Guess a value/, /set the reports against the code/, /`change-order\.md`/, /CHANGE, VERIFY, MEASURE, DECIDE, DOC or FIND/, /closed only with its evidence/, /Drop a finding because it looks small/]) assert.match(skill, law);
  // no schematic: the boards are read from photos (the user, 2026-11-13: "lots of synths dont have service manuals publicly available so we need to support it")
  const boards = readFileSync(join(KIT, 'packs/reverse-engineering/skills/boards-from-photos/SKILL.md'), 'utf8');
  assert.ok(boards.length < 8000);
  assert.match(boards, /^description: Use when a machine has no public service manual/m);
  for (const law of [/Prove the absence first/, /What the sheets would have given/, /FCC ID/, /installation guides/, /two independent photos agree on/, /\[PHOTO\?\]/, /\[DS-REF\]/, /firmware's clock set-up/, /How the search went/, /Commit a photo/, /Chips in Synthesizers/, /spare-parts sellers who sell a part by the machine's name/, /\[\?\]` for the rest/]) assert.match(boards, law);
});

// the user, 2026-11-13: "the kit needs to check at the start whats missing to perform a proper RE ... ironclad"; and "new
// disassemblers should never be in a project ... it now should be in the library"
test('re-toolchain settles every processor\'s tools before the run, and house tools live in the library', () => {
  const skill = readFileSync(join(KIT, 'packs/reverse-engineering/skills/re-toolchain/SKILL.md'), 'utf8');
  assert.ok(skill.length < 8000);
  assert.match(skill, /^description: Use when a work order or a reverse engineering of firmware starts/m);
  for (const law of [/processors: H8\/300H, DSP56300/, /claude-packs toolchain/, /toolchain\/disassemblers/, /toolchain\/emulators\/FAMILY/, /search online/, /ask the user/, /build our own \(the user, yes, DATE\)/, /black box only/, /refuses a run/]) assert.match(skill, law);
  const rule = readFileSync(join(KIT, 'packs/reverse-engineering/rules/house-tools-live-in-the-library.md'), 'utf8');
  for (const law of [/written once, in the reference library/, /toolchain\/disassemblers\/FAMILY/, /`disassembler-in-the-library` refuses it/, /third-party\.md/]) assert.match(rule, law);
});
