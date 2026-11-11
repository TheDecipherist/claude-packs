// lib/pack-manifest.mts: the keys every stock pack.json has and the `tests` map that names every code file of the pack (W7 b).
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fitsOf, missingKeys, testsOf, unnamedCodeFiles, type PackFields } from '../../../lib/pack-manifest.mts';
import { PACKS_DIR, readPack } from '../../../lib/packs.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const KIT = join(PACKS_DIR, '..');
const stock = (): string[] => readdirSync(PACKS_DIR).filter((d) => existsSync(join(PACKS_DIR, d, 'pack.json')));

test('every stock pack.json has the keys: concepts, folders, hooks, skillsIn, tests, requires, fits', () => {
  for (const name of stock()) assert.deepEqual(missingKeys(readPack(name)), [], name);
  assert.deepEqual(missingKeys({ name: 'x', type: 'stock', tests: {} } as PackFields), ['concepts', 'folders', 'hooks', 'skillsIn', 'requires', 'fits']);
  assert.deepEqual(missingKeys({ name: 'x', type: 'custom' } as PackFields), [], 'a custom pack is its author\'s own shape');
});

test('every code file of every pack is a key of its tests, and every test it names exists', () => {
  for (const name of stock()) {
    const pack = readPack(name);
    assert.deepEqual(unnamedCodeFiles(join(PACKS_DIR, name), pack), [], `${name}: code files with no key in tests`);
    for (const tests of Object.values(testsOf(pack))) for (const t of tests) assert.ok(existsSync(join(KIT, t)), `${name}: ${t} does not exist`);
  }
});

test('a planted pack file with no key in tests is named (red), and a key makes it green', () => {
  const dir = scratchDir('pack-keys-');
  put(join(dir, 'hooks', 'planted.mts'), 'export const x = 1;\n');
  put(join(dir, 'tools', 'lib', 'helper.mts'), 'export const y = 1;\n');
  put(join(dir, 'hooks', 'types.d.mts'), 'export type T = 1;\n');
  put(join(dir, 'hooks', 'emitted.mjs'), 'export const z = 1;\n');
  assert.deepEqual(unnamedCodeFiles(dir, { tests: {} } as PackFields), ['hooks/planted.mts', 'tools/lib/helper.mts']);
  assert.deepEqual(unnamedCodeFiles(dir, { tests: { 'hooks/planted.mts': [], 'tools/lib/helper.mts': [] } } as PackFields), []);
});

test('fits lists the configurations a pack may join; none for a configuration\'s own pack', () => {
  assert.deepEqual(fitsOf(readPack('audio-core')), ['synth-creator']);
  assert.deepEqual(fitsOf(readPack('synth-creator')), []);
});
