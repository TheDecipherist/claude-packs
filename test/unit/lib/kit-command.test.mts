// lib/kit-command.mts: how a project runs the kit (KWB-76).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { hasLocalKit, kitCommand, noPackageLine } from '../../../lib/kit-command.mjs';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { KIT } from '../../../packs/base/hooks/lib/kit-version.mts';

test('a project with the kit in node_modules runs it with --no-install, one without fetches it', () => {
  const dir = scratchDir('kitcmd-');
  assert.equal(kitCommand(dir), `npx ${KIT}`);
  put(join(dir, 'node_modules', KIT, 'package.json'), '{}');
  assert.equal(hasLocalKit(dir), true);
  assert.equal(kitCommand(dir), `npx --no-install ${KIT}`);
});

test('the no-package.json line appears only for a project with neither a package.json nor the kit', () => {
  const dir = scratchDir('kitcmd-line-');
  assert.match(noPackageLine(dir)[0] ?? '', new RegExp(`npx ${KIT} <command>`));
  put(join(dir, 'package.json'), '{}');
  assert.deepEqual(noPackageLine(dir), []);
});
