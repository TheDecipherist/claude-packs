// The writing pack in every configuration, with no hook of its own: each configuration brings it, nothing of it is named in the lock,
// and doctor --strict passes (one doctor per configuration, so this file is kept apart from the cheap reads in writing-pack.test.mts, and
// the configurations are shared out over writing-configurations-*.test.mts so no file sums over a minute).
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { KIT } from '../../kit-cli.mts';
import { INSTALLS, holdsThePack } from './writing-configurations-rig.mts';

test('every configuration has an install here, so each is proved by one of the writing-configurations files', () => {
  const configurations = readdirSync(join(KIT, 'configurations'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);   // not shared.json
  assert.deepEqual(configurations.sort(), Object.keys(INSTALLS).sort(), 'a configuration with no install here');
});

holdsThePack(['base', 'cpp']);
