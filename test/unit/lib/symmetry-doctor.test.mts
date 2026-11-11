// lib/symmetry-doctor.mts: doctor's part for the generated gate shape_symmetry.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { symmetryProblems } from '../../../lib/symmetry-doctor.mts';

const run = (dir: string): { problems: string[]; said: string[] } => {
  const said: string[] = [];
  return { problems: symmetryProblems(dir, (l) => said.push(l), { PATH: process.env.PATH }), said };
};

test('a many concept with no symmetry commands is named in a note, not a problem', () => {
  const dir = scratchDir('sym-');
  put(join(dir, 'design/shape.json'), JSON.stringify({ concepts: {
    slot: { shape: 'many' }, osc: { shape: 'many', symmetry: { members: 'a', swap: 'b' } }, mix: { shape: 'one' } } }));
  const { problems, said } = run(dir);
  assert.deepEqual(problems, []);
  assert.equal(said.length, 1);
  assert.match(said[0] ?? '', /: slot$/);
});

test('a shape.json that is not JSON is a problem', () => {
  const dir = scratchDir('sym-');
  put(join(dir, 'design/shape.json'), '{ nope');
  assert.deepEqual(run(dir).problems, ['design/shape.json is not JSON']);
});

test('an installed tool whose selftest fails is a problem carrying what it printed; no tool and no shape is quiet', () => {
  const dir = scratchDir('sym-');
  assert.deepEqual(run(dir), { problems: [], said: [] });
  put(join(dir, '.claude/tools/shape-symmetry.mjs'), 'console.log("planted failure"); process.exit(1);\n');
  const { problems } = run(dir);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^shape-symmetry\.mjs fails its selftest:\nplanted failure/);
});
