// doctor on design/shape.json (split from shape-law.test.mts so no file sums over a minute): "values" and "names" are lists, and a manifest
// that keeps the contract is quiet. (The manifest missing, not parsing, rows breaking the contract: shape-law-doctor.test.mts.)
import { join } from 'node:path';
import { assert, cli, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { SLOT } from './shape-law-rig.mts';

test('doctor reads "values" and "names" as lists (KWB-10, KWB-12), and says nothing of a manifest that keeps the contract', () => {
  const dir = fixture('audio-core');   // init writes the empty manifest
  const file = join(dir, 'design/shape.json');
  writeFileSync(file, JSON.stringify({ concepts: { slot: SLOT }, exclude: [], values: 'Cell' }));
  assert.match(cli(dir, 'doctor').stdout, /"values" must be a list of type names/, 'KWB-10: values is a list');
  writeFileSync(file, JSON.stringify({ concepts: { slot: SLOT }, exclude: [], values: ['Cell', 3] }));
  assert.match(cli(dir, 'doctor').stdout, /"values" must be a list of type names/);
  writeFileSync(file, JSON.stringify({ concepts: { slot: { ...SLOT, names: 'DELAY' } }, exclude: [] }));
  assert.match(cli(dir, 'doctor').stdout, /"slot": names must be a list of identity names/, 'KWB-12: names is a list');
  writeFileSync(file, JSON.stringify({ concepts: { slot: SLOT, mixer: { shape: 'one', id: 'mixer' } }, exclude: [], values: ['Cell', 'Tex'] }));
  const r = cli(dir, 'doctor');
  assert.doesNotMatch(r.stdout, /shape\.json/, r.stdout);
});
