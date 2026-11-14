// shape-hits.mts: the instance literals one line holds for one concept, and the forms that are not instances.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lineHits } from '../../../packs/base/hooks/lib/shape-hits.mts';
import type { LineHit } from '../../../packs/base/hooks/lib/shape-hits.mts';
import { normaliseShape } from '../../../packs/base/hooks/lib/shape-model.mts';

const shape = normaliseShape({ concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i)', arrays: ['gains'] } }, values: ['MidiMessage'] });
const slot = shape.concepts['slot'];
if (!slot) throw new Error('the concept did not compile');
const hits = (line: string, file = 'a.cpp', inSwitch: string | null = null): LineHit[] => lineHits(line, slot, shape, new Map(), inSwitch, file);
const instances = (line: string, file?: string): string[] => hits(line, file).map((h) => h.instance);

test('a number after the concept\'s word is an instance; a value past the count, a whole range and an address are not', () => {
  assert.deepEqual(instances('play(slot 2);'), ['2']);
  assert.deepEqual(instances('slot #3 on'), ['3']);
  assert.deepEqual(instances('gSlot_2 = 1'), ['2']);
  assert.deepEqual(instances('slot 9 is loud'), [], 'past the count of 4');
  assert.deepEqual(instances('slots 0-3 all'), [], 'every instance');
  assert.deepEqual(instances('slots 1-2 only'), ['1']);
  assert.deepEqual(instances('slot 0x18000'), []);
  assert.deepEqual(instances('AIM EFFECTS SLOT 2'), [], 'a control label before the word');
  // KWB-next (supernova2): counts are not instances
  assert.deepEqual(instances('the display reads slots 3 with the card in'), [], 'the plural with one number is a count');
  assert.deepEqual(instances('slot 3 printed pages of 6'), [], 'a number followed by a counted noun');
  assert.deepEqual(instances('slot 3 is muted'), ['3'], 'still an instance without a counted noun');
  assert.deepEqual(instances('SLOTS 2 open'), ['2'], 'a caps label with a number still names one (KWB-22)');
});

test('an ordinal names an instance, except "the first X with" and a role word that is a name or a gate verdict', () => {
  assert.deepEqual(instances('the second slot'), ['2']);
  assert.deepEqual(instances('use the 3rd slot'), ['3']);
  assert.deepEqual(instances('each slot\'s first slot with a name'), []);
  assert.deepEqual(instances('the PAD slot'), ['PAD']);
  assert.deepEqual(instances('FAIL slot'), []);
  assert.deepEqual(instances('the CPU slot fitted'), [], 'a hardware part before the word is a chip, not a role (KWB-next)');
  assert.deepEqual(instances('MIDI Program slot Change'), [], 'a longer proper name');
});

test('an array indexed by a number, a comparison, a case and a driving call are each found; a declaration is not', () => {
  assert.deepEqual(instances('x = gains[1];'), ['1']);
  assert.deepEqual(instances('Slot slots[4];'), [], 'a declaration\'s size');
  assert.deepEqual(instances('if (slotIx == 3) go();'), ['3']);
  assert.deepEqual(instances('if (2 == slotIx) go();'), ['2']);
  // KWB-next (supernova2 KF-11): a named constant is a quantity, and an operand of a sum is no instance
  assert.deepEqual(instances('if (SN2_SLOT_HOST_FILL != 0) go();'), [], 'a macro whose name carries the word');
  assert.deepEqual(instances('if (steps % kStepsPerSlotStep == 0) step();'), [], 'a kName constant inside a modulo');
  assert.deepEqual(instances('if (0 == kSlotFill) go();'), [], 'a kName constant on the right');
  assert.deepEqual(instances('if (cfg.slotIx == 2) go();'), ['2'], 'a member that holds one instance still counts');
  assert.deepEqual(instances('if (1 + 2 == slotIx) go();'), [], 'a sum is an operand');
  assert.deepEqual(instances('case 2:', 'a.cpp'), []);
  assert.deepEqual(hits('case 2:', 'a.cpp', 'slot').map((h) => h.instance), ['2']);
  const call = hits('selectSlot(2, x);');
  assert.equal(call[0]?.call, 'selectSlot');
  assert.deepEqual(instances('juce::MidiMessage::slotChange(2, x);'), [], 'a library call');
});

test('a sentence in a quoted string is text, a short key is not; a pattern in the row is matched as written', () => {
  assert.deepEqual(instances('log("please use slot 2 now");'), []);
  assert.deepEqual(instances('key("slot 2");'), ['2']);
  assert.deepEqual(instances('log("please use slot 2 now");', 'a.md'), ['2'], 'a document has no strings to blank');
  const withPattern = normaliseShape({ concepts: { slot: { shape: 'many', count: 4, generator: 'g()', patterns: ['(S\\d)'] } } }).concepts['slot'];
  assert.ok(withPattern);
  assert.deepEqual(lineHits('use S3', withPattern, shape, new Map(), null, 'a.cpp').map((h) => h.instance), ['S3']);
});
