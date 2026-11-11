// lib/configs.mts: the configurations as data, and the packs a project may take under one.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { allowedPacks, availableConfigs, configProblems, describeSwitch, inferConfig, itemsOf, listedPacks, packsFor, readConfig, resolveConfig, sourceFilesOf } from '../../../lib/configs.mjs';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('every configuration reads, and an unknown one names what is available', () => {
  const names = availableConfigs();
  assert.ok(names.includes('synth-creator') && names.includes('node'));
  assert.equal(readConfig('node').packs.always[0], 'base');
  assert.throws(() => readConfig('no-such'), /unknown configuration "no-such" \(available: .*node/);
});

test('packsFor puts base first and refuses a pack the configuration does not take (a planted wrong pack)', () => {
  const node = readConfig('node');
  const taken = packsFor(node, ['base', 'zod']);
  assert.equal(taken[0], 'base');
  assert.ok(taken.includes('zod') && taken.filter((p) => p === 'base').length === 1);
  assert.throws(() => packsFor(node, ['stellix', 'midi']), /stellix, midi are not in configuration node/);
  assert.ok(allowedPacks(node).includes('zod'));
});

test('listedPacks leaves out a configuration\'s own packs but base', () => {
  const synth = readConfig('synth-creator');
  const own = synth.packs.always.filter((p) => p !== 'base');
  assert.ok(own.length > 0);
  assert.deepEqual(listedPacks(synth, [...synth.packs.always, 'midi']).filter((p) => own.includes(p)), []);
  assert.ok(listedPacks(synth, synth.packs.always).includes('base'));
});

test('inferConfig takes the smallest configuration that takes every pack, and throws when none does', () => {
  assert.ok(allowedPacks(inferConfig(['base'])).includes('base'));
  assert.throws(() => inferConfig(['no-such-pack']), /no configuration takes the packs no-such-pack/);
});

test('resolveConfig: named wins, then layout.json\'s, then the packs\'', () => {
  assert.deepEqual([resolveConfig({ named: 'go' }).how, resolveConfig({ layout: { configuration: 'rust' } }).how, resolveConfig({ packs: ['base'] }).how], ['named', 'layout', 'packs']);
  assert.equal(resolveConfig({ named: 'go', layout: { configuration: 'rust' } }).config.name, 'go');
});

test('itemsOf sorts a plan into rules, hooks, checks and skills', () => {
  const items = itemsOf(new Set(['.claude/rules/b.md', '.claude/rules/a.md', '.claude/hooks/h.mjs', '.claude/checks/c.json', '.claude/skills/s/SKILL.md', 'docs/x.md']));
  assert.deepEqual(items, { rules: ['a.md', 'b.md'], hooks: ['h.mjs'], checks: ['c.json'], skills: ['s'] });
});

test('describeSwitch says what a switch adds and removes, and "no change" for none', () => {
  const from = readConfig('node'), to = readConfig('synth-creator');
  const lines = describeSwitch(from, from.packs.always, to, to.packs.always, { folders: {}, disable: [] });
  assert.match(lines[0] ?? '', /node -> synth-creator/);
  assert.ok(lines.length > 1);
  assert.deepEqual(describeSwitch(from, from.packs.always, from, from.packs.always, { folders: {}, disable: [], complete: true }).slice(1), ['  no change']);
});

test('configProblems names a configuration the kit lacks, and a pack the configuration does not take', () => {
  const dir = scratchDir('configs-problems-');
  assert.deepEqual(configProblems(dir, ['base'], () => undefined), []);
  put(join(dir, '.claude', 'layout.json'), JSON.stringify({ configuration: 'no-such' }));
  assert.match(configProblems(dir, ['base'], () => undefined)[0] ?? '', /names configuration "no-such", which this kit does not have/);
  put(join(dir, '.claude', 'layout.json'), JSON.stringify({ configuration: 'node' }));
  const logged: string[] = [];
  assert.match(configProblems(dir, ['base', 'stellix'], (l) => logged.push(l))[0] ?? '', /pack stellix is installed but configuration node does not take it/);
  assert.match(logged[0] ?? '', /configuration: node/);
});

test('sourceFilesOf prefers the project\'s own regex, then the configuration\'s, and is undefined when none', () => {
  const dir = scratchDir('configs-source-');
  put(join(dir, '.claude', 'layout.json'), JSON.stringify({ sourceFiles: '\\.zz$' }));
  assert.equal(sourceFilesOf(dir, ['base'])?.test('A.ZZ'), true);
  put(join(dir, '.claude', 'layout.json'), JSON.stringify({ configuration: 'no-such' }));
  assert.equal(sourceFilesOf(dir, ['base']), undefined);
});
