// lib/selftest-cache.mts (KWB-41): a passed selftest is remembered by the hash of what it ran on.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { filesUnder, importsOf, proved, remember, selftestKey, sharedHash } from '../../../lib/selftest-cache.mts';

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
  // d-7: the lib file moved out of the shared hash into each importing hook's key (next test); the runner stays in it
  const claude = install();
  const env = {};
  const base = sharedHash(claude, {}, env);
  put(join(claude, 'hooks/lib/a.mts'), 'changed source');
  assert.equal(sharedHash(claude, {}, env), base);
  assert.notEqual(sharedHash(claude, { git: { pushNeedsYes: true } }, env), base);
  assert.notEqual(sharedHash(claude, {}, { CLAUDE_PACKS_JSCPD: '/x/jscpd' }), base);
  put(join(claude, 'hooks/run-hooks.mjs'), 'runner edited');
  assert.notEqual(sharedHash(claude, {}, env), base);
});

test('a lib no hook imports leaves the shared hash alone; the hooks that import it take it in their own key (d-7)', () => {
  const claude = install();
  const shared = sharedHash(claude, {}, {});
  put(join(claude, 'hooks/imports.mjs'), "import { a } from './lib/a.mjs';\nexport const x = a;\n");
  const before = { h: selftestKey(join(claude, 'hooks/h.mjs'), shared), i: selftestKey(join(claude, 'hooks/imports.mjs'), shared) };
  put(join(claude, 'hooks/lib/a.mjs'), 'export const a = 2;');
  assert.equal(sharedHash(claude, {}, {}), shared);
  assert.equal(selftestKey(join(claude, 'hooks/h.mjs'), shared), before.h, 'a hook that does not import it keeps its key');
  assert.notEqual(selftestKey(join(claude, 'hooks/imports.mjs'), shared), before.i, 'a hook that imports it misses the memory');
});

test('a transitive import of a hook is in its key, and a changed one misses the memory', () => {
  const claude = scratchDir('stcache-transitive-');
  const env = { CLAUDE_PACKS_SELFTEST_CACHE: join(scratchDir('stcache-folder-'), 'memory') };
  put(join(claude, 'hooks/h.mjs'), "import { b } from './lib/b.mjs';\nexport const h = b;\n");
  put(join(claude, 'hooks/lib/b.mjs'), "export { c } from './c.mjs';\nexport const b = 1;\n");
  put(join(claude, 'hooks/lib/c.mjs'), 'export const c = 1;\n');
  const hook = join(claude, 'hooks/h.mjs');
  assert.deepEqual(importsOf(hook), ['h.mjs', 'lib/b.mjs', 'lib/c.mjs'].map((f) => join(claude, 'hooks', f)));
  remember(selftestKey(hook, sharedHash(claude, {}, env)), env);
  assert.equal(proved(selftestKey(hook, sharedHash(claude, {}, env)), env), true);
  put(join(claude, 'hooks/lib/c.mjs'), 'export const c = 2;\n');
  assert.equal(proved(selftestKey(hook, sharedHash(claude, {}, env)), env), false, 'c.mjs is two imports away, and it counts');
});

test('the default memory is ~/.cache/claude-packs, and the run\'s own folder wins', () => {
  const key = 'k'.repeat(64);
  const env = { CLAUDE_PACKS_SELFTEST_CACHE: join(scratchDir('stcache-folder-'), 'memory') };
  remember(key, env);
  assert.equal(proved(key, env), true);
  assert.equal(proved(key, {}), false, 'the default folder is another one');
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
