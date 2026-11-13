// lib/install-block.mts: the install block of a work order, one fenced block with only keys the kit reads.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BLOCK_KEYS, blockPacks, installBlockOf } from '../../../lib/install-block.mts';

const order = (yaml: string): string => `# Order\n\n\`\`\`claude-packs\n${yaml}\n\`\`\`\n`;

test('a block gives its configuration, its packs (a list or a comma line) and the layout keys it owns', () => {
  const block = installBlockOf(order('configuration: node\npacks: [js-ts, mongo]\nenable:\n  - hooks/x.mjs'));
  assert.equal(block.configuration, 'node');
  assert.deepEqual(block.packs, ['js-ts', 'mongo']);
  assert.deepEqual(block.owned, { enable: ['hooks/x.mjs'] });
  assert.deepEqual(installBlockOf(order('packs: "cpp, audio-core"')).packs, ['cpp', 'audio-core']);
  assert.equal(installBlockOf(order('packs: [base]')).configuration, null);
});

test('no block, two blocks, a block that is not YAML, a key the kit does not read, and packs of the wrong kind are each refused with the reason', () => {
  assert.throws(() => installBlockOf('# nothing'), /has no install block/);
  assert.throws(() => installBlockOf(order('packs: [a]') + order('packs: [b]')), /has 2 install blocks/);
  assert.throws(() => installBlockOf(order('packs: [a')), /not YAML/);
  assert.throws(() => installBlockOf(order('flavour: mint')), /"flavour", a key the kit does not read/);
  assert.throws(() => installBlockOf(order('- a\n- b')), /holds no keys/);
  assert.throws(() => installBlockOf(order('packs: 5')), /packs is a list or a comma-separated line/);
});

test('every layout key a project owns is a key of the block', () => {
  for (const key of ['configuration', 'packs', 'enable', 'guards', 'commands']) assert.ok(BLOCK_KEYS.includes(key), key);
});

test('with no packs named, a block installs its configuration\'s defaults', () => {
  const named = blockPacks({ configuration: 'node', packs: [], owned: {}, ghidra: [], processors: [] });
  assert.ok(named.length > 0 && named.includes('js-ts'));
  assert.deepEqual(blockPacks({ configuration: 'node', packs: ['mongo'], owned: {}, ghidra: [], processors: [] }), ['mongo']);
  assert.deepEqual(blockPacks({ configuration: null, packs: [], owned: {}, ghidra: [], processors: [] }), []);
});
