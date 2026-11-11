// KWB-83: what update does with the folders and concepts of an installed project (split from rules-follow-the-code.test.mts so no file sums
// over a minute).
import { assert, join, mkdirSync, run, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { layoutOf, pathsOf } from './rules-follow-the-code-rig.mts';

test('a folder added to the layout later gets its rules on update; test/structure.test.mjs holds that a stray file is still reported', () => {
  const dir = fixture('cpp');
  const mine = layoutOf(dir);
  mine.folders.engine = { path: 'engine', purpose: 'the engine' };
  writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify(mine, null, 2));
  mkdirSync(join(dir, 'engine'));
  writeFileSync(join(dir, 'engine/a.cpp'), 'int a;\n');
  run(dir, 'update');
  assert.ok(layoutOf(dir).concepts.cpp?.includes('engine/**/*.cpp'));
});

test('an installed project keeps its own concepts and folders on update: a new law never moves under it', () => {
  const dir = fixture('cpp');
  const mine = layoutOf(dir);
  mine.concepts.cpp = ['src/**/*.cpp'];
  delete mine.followFolders; // a project from before 1.1.0 has no such key
  writeFileSync(join(dir, '.claude/layout.json'), JSON.stringify(mine, null, 2));
  mkdirSync(join(dir, 'later'));
  writeFileSync(join(dir, 'later/a.cpp'), 'int a;\n');
  run(dir, 'update');
  assert.deepEqual(layoutOf(dir).concepts.cpp, ['src/**/*.cpp']);
  assert.ok(!pathsOf(dir).includes('later'));
});
