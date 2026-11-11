// kit-version.mts: the kit version a project runs: its installed package first, the lock's note only where none is installed (KWB-162).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { KIT, checkoutVersion, lockVersion, packageVersion, runningKit } from '../../../packs/base/hooks/lib/kit-version.mts';

const pkg = (dir: string, name: string, version: unknown): void => put(join(dir, 'node_modules', '@thedecipherist', 'claude-packs', 'package.json'), JSON.stringify({ name, version }));
const lock = (dir: string, kit: unknown): void => put(join(dir, '.claude', 'claude-packs.lock.json'), JSON.stringify({ kit }));

test('the installed package wins over the lock, which a --no-save install leaves behind', () => {
  const dir = scratchDir('kit-version-');
  pkg(dir, KIT, '2.0.0');
  lock(dir, '1.9.0');
  assert.equal(packageVersion(dir), '2.0.0');
  assert.equal(lockVersion(dir), '1.9.0');
  assert.equal(runningKit(dir), '2.0.0');
});

test('with no package the lock answers, and with neither the answer is null', () => {
  const dir = scratchDir('kit-version-');
  assert.equal(runningKit(dir), null);
  lock(dir, '1.9.0');
  assert.equal(runningKit(dir), '1.9.0');
  assert.equal(runningKit(null), null);
  assert.equal(runningKit(undefined), null);
});

test('a package of another name, a version that is not text and a lock with no text are not read: planted wrong input', () => {
  const dir = scratchDir('kit-version-');
  pkg(dir, 'someone-else', '9.9.9');
  assert.equal(packageVersion(dir), null);
  pkg(dir, KIT, 7);
  assert.equal(packageVersion(dir), null);
  lock(dir, 3);
  assert.equal(lockVersion(dir), null);
});

test('checkoutVersion reads the checkout\'s own package.json by the same rule', () => {
  const dir = scratchDir('kit-version-');
  put(join(dir, 'package.json'), JSON.stringify({ name: KIT, version: '3.1.4' }));
  assert.equal(checkoutVersion(dir), '3.1.4');
  put(join(dir, 'package.json'), JSON.stringify({ name: 'other', version: '3.1.4' }));
  assert.equal(checkoutVersion(dir), null);
});
