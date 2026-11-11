// lib/config-merge.mts: a configuration is the shared base plus deltas, and each delta file stays small (W7 b).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { applyLines, mergeConfig, type SharedConfig } from '../../../lib/config-merge.mts';
import { CONFIGS_DIR, availableConfigs, readConfig } from '../../../lib/configs.mts';
import { walk } from '../../../packs/base/hooks/lib/files.mts';
import { PACKS_DIR } from '../../../lib/packs.mts';

const MAX_DELTA_LINES = 60;
const KIT = join(PACKS_DIR, '..');

test('each of the 8 configuration files holds under 60 lines of deltas', () => {
  const names = availableConfigs();
  assert.equal(names.length, 8);
  for (const name of names) {
    const lines = readFileSync(join(CONFIGS_DIR, name, 'config.json'), 'utf8').trimEnd().split('\n').length;
    assert.ok(lines < MAX_DELTA_LINES, `${name}: ${lines} lines`);
  }
});

test('the preamble lines every configuration shares are written once, in shared.json', () => {
  const shared = readFileSync(join(CONFIGS_DIR, 'shared.json'), 'utf8');
  const firstLine = readConfig('cpp').preamble?.always[0] ?? '';
  assert.ok(firstLine.length > 20 && shared.includes(firstLine));
  for (const name of availableConfigs()) assert.ok(!readFileSync(join(CONFIGS_DIR, name, 'config.json'), 'utf8').includes(firstLine), `${name} repeats it`);
  for (const name of availableConfigs()) assert.equal(readConfig(name).preamble?.always[0], firstLine, name);
});

test('applyLines replaces and inserts by index', () => {
  assert.deepEqual(applyLines(['a', 'b', 'c'], { replace: { '2': 'C' }, insert: { '1': ['x'], '3': ['end'] } }), ['a', 'x', 'b', 'C', 'end']);
  assert.deepEqual(applyLines(['a']), ['a']);
});

test('mergeConfig: own sections replace the shared ones, null takes an entry out, a pack joins by its fits', () => {
  const shared: SharedConfig = {
    packs: { always: ['base', 'writing'] },
    layout: { folders: { docs: { path: 'docs' }, src: { path: 'src' } }, kinds: { docs: { in: 'docs' } } },
    preamble: { always: ['one'], never: ['two'] },
  };
  const fits = { zod: ['demo'], midi: ['other'], writing: ['demo'] };
  const made = mergeConfig('demo', shared, { packs: { with: ['mine'] }, layout: { folders: { src: null, lib: { path: 'lib' } }, own: ['kinds'] } }, fits);
  assert.deepEqual(made.packs.always, ['base', 'mine', 'writing']);
  assert.deepEqual(made.packs.choose, ['zod'], 'writing is always, midi fits another');
  assert.deepEqual(Object.keys(made.layout?.folders ?? {}), ['docs', 'lib']);
  assert.deepEqual(made.layout?.kinds, {});
});

test('no literal npx kit command stays in work order templates and planner text (kitCommand is the one place)', () => {
  const files = [...walk(join(KIT, 'prompts', 'workorder')), ...walk(join(KIT, 'planner')), join(KIT, 'lib', 'planner.mts')].filter((f) => /\.(?:md|sh|mts)$/.test(f));
  assert.ok(files.length > 8);
  for (const f of files) assert.ok(!/\bnpx\s/.test(readFileSync(f, 'utf8')), `${f} names npx: use {{kit}} or kitCommand`);
});
