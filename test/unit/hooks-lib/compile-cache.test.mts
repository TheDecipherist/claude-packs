// compile-cache.mts: which build folders a command builds, and which compile without the shared cache (KWB-112).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { foldersBuiltBy, uncached, uncachedBuild } from '../../../packs/base/hooks/lib/compile-cache.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('foldersBuiltBy: cmake --build and ninja -C, a leading cd, quoted text left out', () => {
  assert.deepEqual(foldersBuiltBy('cmake --build build -j8', '/p'), ['/p/build']);
  assert.deepEqual(foldersBuiltBy('cd /q && ninja -C out/r', '/p'), ['/q/out/r']);
  assert.deepEqual(foldersBuiltBy('cmake --build /abs/b', '/p'), ['/abs/b']);
  assert.deepEqual(foldersBuiltBy('echo "cmake --build nope"', '/p'), []);
  assert.deepEqual(foldersBuiltBy('ls', '/p'), []);
});

test('uncached: a configured C++ build with no ccache launcher; a launcher in the cache or in the rules is cached', () => {
  const none = scratchDir('cc-');
  assert.equal(uncached(none), false);                                                 // not configured
  put(join(none, 'CMakeCache.txt'), 'CMAKE_C_COMPILER:FILEPATH=/cc\n');
  assert.equal(uncached(none), false);                                                 // no C++
  put(join(none, 'CMakeCache.txt'), 'CMAKE_CXX_COMPILER:FILEPATH=/c++\n');
  assert.equal(uncached(none), true);                                                  // the planted fault
  put(join(none, 'CMakeCache.txt'), 'CMAKE_CXX_COMPILER:FILEPATH=/c++\nCMAKE_CXX_COMPILER_LAUNCHER:STRING=/bin/ccache\n');
  assert.equal(uncached(none), false);
  put(join(none, 'CMakeCache.txt'), 'CMAKE_CXX_COMPILER:FILEPATH=/c++\n');
  put(join(none, 'build.ninja'), 'LAUNCHER = ccache\n');
  assert.equal(uncached(none), false);
});

test('uncachedBuild: the first uncached folder, null when ccache is missing', () => {
  const dir = scratchDir('cc-');
  put(join(dir, 'b/CMakeCache.txt'), 'CMAKE_CXX_COMPILER:FILEPATH=/c++\n');
  assert.equal(uncachedBuild('cmake --build b', dir, () => true), join(dir, 'b'));
  assert.equal(uncachedBuild('cmake --build b', dir, () => false), null);
  assert.equal(uncachedBuild('ls', dir, () => true), null);
});
