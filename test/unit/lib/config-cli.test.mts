// lib/config-cli.mts: `config <name>`: the project's configuration from its layout, and a switch that is refused, or only said (--dry-run).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeConfigs, layoutConfiguration, readConfig, switchConfig } from '../../../lib/config-cli.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('the project\'s configuration is the one its layout names, else none', () => {
  const dir = scratchDir('configcli-');
  assert.equal(layoutConfiguration(dir), null);
  put(`${dir}/.claude/layout.json`, JSON.stringify({ folders: {}, concepts: {}, configuration: 'node' }));
  assert.equal(layoutConfiguration(dir), 'node');
});

test('the commands it re-exports are the configs ones', () => {
  assert.equal(readConfig('base').name, 'base');
  assert.match(describeConfigs('base'), /^base {2}\(this project\)/);
});

test('a switch with no name, or in a project with nothing installed, is refused with what to do', async () => {
  const dir = scratchDir('configcli-refuse-');
  await assert.rejects(switchConfig(dir, undefined, ['base']), /name the configuration/);
  await assert.rejects(switchConfig(dir, 'node', []), /nothing installed here/);
  await assert.rejects(switchConfig(dir, 'no-such-config', ['base']), /./, 'a configuration that does not exist is not switched to');
});

test('--dry-run prints what the switch would change and writes nothing', async () => {
  const dir = scratchDir('configcli-dry-');
  const said: string[] = [];
  const code = await switchConfig(dir, 'node', ['base'], { dryRun: true, log: (l) => said.push(l) });
  assert.equal(code, 0);
  assert.match(said[0] ?? '', /^ {2}\w[\w-]* -> node$/);
  assert.equal(said.at(-1), 'dry run: nothing changed');
  assert.equal(layoutConfiguration(dir), null, 'no layout was written');
});
