// The writing pack in every configuration, with no hook of its own: each configuration brings it, nothing of it is named in the lock,
// and doctor --strict passes (one doctor per configuration, so this file is kept apart from the cheap reads in writing-pack.test.mts).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { KIT, cli } from '../../kit-cli.mts';
import { extraFixture, fixture } from '../hook-rig.mts';

// The run's install of each configuration (the fixtures name most; the rest are built once under their own name).
const INSTALLS: Readonly<Record<string, () => string>> = {
  'base': () => fixture('base'),
  'cpp': () => fixture('cpp'),
  'full-stack': () => fixture('full-stack'),
  'go': () => fixture('go+multi-tenant'),
  'node': () => extraFixture('node', ['--config', 'node']),
  'python': () => fixture('python+shell'),
  'rust': () => fixture('rust'),
  'synth-creator': () => fixture('synth-creator'),
};

test('every configuration brings the pack; nothing of it is named in the lock, and doctor --strict passes', () => {
  const configurations = readdirSync(join(KIT, 'configurations'));
  assert.deepEqual([...configurations].sort(), Object.keys(INSTALLS).sort(), 'a configuration with no install here');
  for (const config of configurations) {
    const dir = INSTALLS[config]?.() ?? '';
    assert.ok(readFileSync(join(dir, '.claude/rules/cut-the-padding.md'), 'utf8').includes('README*'), config);
    assert.equal(cli(dir, 'doctor', '--strict').status, 0, config);
  }
});
