// What the writing-configurations files share: the run's install of each configuration, and the test that one brings the writing pack
// and passes doctor --strict.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { cli } from '../../kit-cli.mts';
import { extraFixture, fixture } from '../hook-rig.mts';

// The run's install of each configuration (the fixtures name most; the rest are built once under their own name).
export const INSTALLS: Readonly<Record<string, () => string>> = {
  'base': () => fixture('base'),
  'cpp': () => fixture('cpp'),
  'full-stack': () => fixture('full-stack'),
  'go': () => fixture('go+multi-tenant'),
  'node': () => extraFixture('node', ['--config', 'node']),
  'python': () => fixture('python+shell'),
  'rust': () => fixture('rust'),
  'synth-creator': () => fixture('synth-creator'),
};

/** One test per named configuration: it brings the pack, and doctor --strict passes there. */
export function holdsThePack(names: readonly string[]): void {
  for (const config of names) {
    test(`${config}: the configuration brings the pack; nothing of it is named in the lock, and doctor --strict passes`, () => {
      const dir = INSTALLS[config]?.() ?? '';
      assert.ok(readFileSync(join(dir, '.claude/rules/cut-the-padding.md'), 'utf8').includes('README*'), config);
      assert.equal(cli(dir, 'doctor', '--strict').status, 0, config);
    });
  }
}
