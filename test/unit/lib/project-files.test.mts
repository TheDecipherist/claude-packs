// lib/project-files.mts and lib/found-folders.mts: the files a project has, and the folders its source lives in.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { gitRun } from '../../../packs/base/hooks/lib/git-run.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { foundFolders, withFoundFolders } from '../../../lib/found-folders.mts';
import { filesOf } from '../../../lib/project-files.mts';

const env = process.env;

test('outside git, filesOf walks and leaves out what is built, fetched or the kit\'s own', () => {
  const dir = scratchDir('files-walk-');
  put(join(dir, 'src/a.ts'), 'a');
  put(join(dir, 'node_modules/x/i.js'), 'x');
  put(join(dir, 'build/o.o'), 'x');
  put(join(dir, '.claude/rules/r.md'), 'x');
  put(join(dir, 'cmake-build-debug/c'), 'x');
  assert.deepEqual(filesOf(dir, env), ['src/a.ts']);
});

test('inside git, filesOf lists tracked and untracked files, and not an ignored one', () => {
  const dir = scratchDir('files-git-');
  assert.ok(gitRun(['init', '-q'], { cwd: dir, env }).ok);
  put(join(dir, '.gitignore'), 'secret.txt\n');
  put(join(dir, 'a.ts'), 'a');
  put(join(dir, 'secret.txt'), 's');
  assert.deepEqual(filesOf(dir, env).sort(), ['.gitignore', 'a.ts']);
});

test('a missing folder has no files, and does not throw', () => {
  assert.deepEqual(filesOf(join(scratchDir('files-none-'), 'nowhere'), env), []);
});

test('foundFolders names the top-level folders that hold source, not the ones that are not the project\'s', () => {
  const dir = scratchDir('found-');
  for (const f of ['lib/a.ts', 'lib/net/b.ts', 'app/c.ts', 'vendor/d.ts', 'docs/e.ts', 'top.ts', 'README.md']) put(join(dir, f), 'x');
  assert.deepEqual(foundFolders(dir, undefined, []), ['app', 'lib']);
  assert.deepEqual(foundFolders(dir, undefined, ['lib']), ['app']);
});

test('withFoundFolders adds the found folders to a seed, says so, and leaves a complete layout alone', () => {
  const dir = scratchDir('found-seed-');
  put(join(dir, 'lib/a.ts'), 'x');
  const said: string[] = [];
  const config = { packs: { always: [], choose: [], default: [] } };
  const seeded = withFoundFolders(dir, { folders: { x: { path: 'x' } } }, config, (l) => said.push(l));
  assert.deepEqual(Object.keys(seeded?.folders ?? {}).sort(), ['lib', 'x']);
  assert.match(said.join(''), /your source is in lib\//);
  const complete = { complete: true, folders: {}, concepts: {} };
  assert.equal(withFoundFolders(dir, complete, config, () => {}), complete);
  assert.equal(withFoundFolders(scratchDir('found-empty-'), null, config, () => {}), null);
});
