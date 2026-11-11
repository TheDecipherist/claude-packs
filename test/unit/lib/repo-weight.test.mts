// lib/repo-weight.mts: what a repo carries that is not source.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { buildFolders, repoWeight, weightLines } from '../../../lib/repo-weight.mts';

test('a folder holding CMakeFiles or CMakeCache.txt is a build folder, whatever its name; the outermost of nested ones', () => {
  assert.deepEqual(buildFolders(['build-reso/CMakeCache.txt', 'build-reso/CMakeFiles/x.o', 'src/a.cpp']), ['build-reso/']);
  assert.deepEqual(buildFolders(['out/CMakeCache.txt', 'out/sub/CMakeCache.txt']), ['out/']);
  assert.deepEqual(buildFolders(['src/a.cpp', 'CMakeLists.txt']), []);
});

test('repoWeight sizes the tracked files, lists root images, build output, and skips a file that is gone', () => {
  const dir = scratchDir('weight-');
  put(join(dir, 'shot.png'), 'x');
  put(join(dir, 'src/a.cpp'), 'int a;\n');
  put(join(dir, 'build/CMakeCache.txt'), 'c');
  const files = ['shot.png', 'src/a.cpp', 'build/CMakeCache.txt', 'vanished.txt'];
  const w = repoWeight(dir, files);
  assert.equal(w.files, 4);
  assert.equal(w.mb, 0);
  assert.deepEqual(w.big, []);
  assert.deepEqual(w.rootImages, ['shot.png']);
  assert.deepEqual(w.built, [{ folder: 'build/', files: 1 }]);
  const lines = weightLines(w);
  assert.match(lines[0] ?? '', /^- 0 MB tracked; 0 file\(s\) over 10 MB$/);
  assert.ok(lines.some((l) => l.includes('build output held in git: build/')));
  assert.ok(lines.some((l) => l.includes('1 image(s) in the repo root')));
});
