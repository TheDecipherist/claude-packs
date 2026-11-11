// making-concepts.mts: which concepts a step's words touch, which a making line names that the manifest lacks, and the making lines of build.md.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { conceptsIn, makingLines, unknownConcepts } from '../../../packs/base/hooks/lib/making-concepts.mts';
import type { LoadedShape, ShapeConceptData } from '../../../packs/base/hooks/lib/shape.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

function concept(name: string, over: Partial<ShapeConceptData> = {}): ShapeConceptData {
  return { name, row: {}, shape: 'many', count: 4, id: null, words: [], plural: new Set(), single: [], patterns: [], badPatterns: [], arrays: [], generatorName: null, names: new Set(), selectors: [], ...over } as ShapeConceptData;
}
const shape: Pick<LoadedShape, 'concepts'> = { concepts: { slot: concept('slot', { words: ['voice'], arrays: ['slots'], generatorName: 'slotId' }), editKnob: concept('editKnob') } };

test('a concept is touched by its name, a word of it, a per-instance array or its generator', () => {
  assert.deepEqual([...conceptsIn('draw the slot rows', shape)], ['slot']);
  assert.deepEqual([...conceptsIn('every voice sings', shape)], ['slot']);
  assert.deepEqual([...conceptsIn('const x = slots[i]', shape)], ['slot']);
  assert.deepEqual([...conceptsIn('slotId(i, "a")', shape)], ['slot']);
  assert.deepEqual([...conceptsIn('the edit knob', shape)], [], 'editKnob is one word, not edit and knob apart');
  assert.deepEqual([...conceptsIn('an editKnob here', shape)], ['editKnob']);
  assert.deepEqual([...conceptsIn('anything', null)], []);
});

test('a making line\'s concepts the manifest does not know are listed, and bracketed shapes are ignored', () => {
  assert.deepEqual(unknownConcepts('making: x; concepts: slot (many, 4; slotId(i, f)), ghost, none; reuse: y', shape), ['ghost']);
  assert.deepEqual(unknownConcepts('making: x; concepts: slot, many', shape), []);
  assert.deepEqual(unknownConcepts('making: x; concepts: whatever', null), ['whatever'], 'a project with no shape knows none');
});

test('the making lines of In progress are read, and the planted missing file or section gives none', () => {
  const dir = scratchDir('making-');
  assert.deepEqual(makingLines(dir, dir), []);
  put(join(dir, 'build.md'), '# b\n\n## In progress\n\n- work/x: making: a; concepts: none\n\n## Steps\n- making: not here\n');
  assert.deepEqual(makingLines(dir, dir), ['making: a; concepts: none']);
  put(join(dir, 'build.md'), '# b\n\n## Steps\n- making: no\n');
  assert.deepEqual(makingLines(dir, dir), []);
});

test('with no build.md of its own a checkout reads the project\'s', () => {
  const project = scratchDir('making-main-');
  const wt = scratchDir('making-wt-');
  put(join(project, 'build.md'), '## In progress\n- making: p; concepts: none\n');
  assert.deepEqual(makingLines(wt, project), ['making: p; concepts: none']);
});
