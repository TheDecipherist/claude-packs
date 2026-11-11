// doctor on design/shape.json (split from shape-law.test.mts so no file sums over a minute): the manifest missing, not parsing, and its
// rows breaking the contract (the lists: shape-law-doctor-lists.test.mts).
import { join } from 'node:path';
import { assert, cli, existsSync, rmSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';
import { SLOT } from './shape-law-rig.mts';

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
});
