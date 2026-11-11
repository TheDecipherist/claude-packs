// lib/selftest-cache.mts (KWB-41): a passed selftest is remembered by the hash of what it ran on.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { filesUnder, proved, remember, selftestKey, sharedHash } from '../../../lib/selftest-cache.mts';

function install(): string {
  const claude = scratchDir('stcache-');
  put(join(claude, 'hooks/lib/a.mjs'), 'a');
  put(join(claude, 'hooks/lib/a.mts'), 'source never installed');
  put(join(claude, 'hooks/run-hooks.mjs'), 'runner');
  put(join(claude, 'hooks/h.mjs'), 'hook');
  return claude;
}

test('filesUnder leaves out what an install never holds', () => {
  const claude = install();
  assert.deepEqual(filesUnder(join(claude, 'hooks/lib')), [join(claude, 'hooks/lib/a.mjs')]);
});

test('the shared hash changes with a lib file, the guards and the detector, and not with a build-only file', () => {
  const claude = install();
  const env = {};
  const base = sharedHash(claude, {}, env);
  put(join(claude, 'hooks/lib/a.mts'), 'changed source');
  assert.equal(sharedHash(claude, {}, env), base);
  assert.notEqual(sharedHash(claude, { git: { pushNeedsYes: true } }, env), base);
  assert.notEqual(sharedHash(claude, {}, { CLAUDE_PACKS_JSCPD: '/x/jscpd' }), base);
  put(join(claude, 'hooks/lib/a.mjs'), 'edited');
  assert.notEqual(sharedHash(claude, {}, env), base);
});

test('a selftest key follows the hook and the shared hash; a remembered key is proved, an unremembered one is not', () => {
  const claude = install();
  const env = { CLAUDE_PACKS_SELFTEST_CACHE: join(scratchDir('stcache-folder-'), 'memory') };
  const shared = sharedHash(claude, {}, env);
  const key = selftestKey(join(claude, 'hooks/h.mjs'), shared);
  assert.equal(proved(key, env), false);
  remember(key, env);
  assert.equal(proved(key, env), true);
  put(join(claude, 'hooks/h.mjs'), 'hook changed');
  assert.notEqual(selftestKey(join(claude, 'hooks/h.mjs'), shared), key);
  assert.equal(proved(selftestKey(join(claude, 'hooks/h.mjs'), shared), env), false, 'a changed hook runs again');
});

test('remember never throws when the memory cannot be written', () => {
  const dir = scratchDir('stcache-');
  put(join(dir, 'file'), 'a file where the folder should be');
  assert.doesNotThrow(() => remember('k', { CLAUDE_PACKS_SELFTEST_CACHE: join(dir, 'file', 'sub') }));
});
