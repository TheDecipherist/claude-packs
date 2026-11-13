// chip-search: finds the reference library and hands the question to its own search, carrying no database driver; with no
// library it exits 4 and says how to get one. A fake library (tools/search.mjs that echoes its arguments and exits with a code
// named in them) stands in for the real one.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { libraryDir } from '../../../packs/base/tools/chip-search.mts';

const TOOL = fileURLToPath(new URL('../../../packs/base/tools/chip-search.mts', import.meta.url));
const fakeLibrary = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'reference-library-'));
  mkdirSync(join(dir, 'tools'));
  writeFileSync(join(dir, 'tools', 'search.mjs'), "console.log('from: files ' + process.argv.slice(2).join(' ')); process.exit(process.argv.includes('--missing') ? 1 : 0);\n");
  return dir;
};
const run = (args: string[], env: NodeJS.ProcessEnv) => spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });

test('the library is REFERENCE_LIBRARY when it holds tools/search.mjs, and nothing otherwise', () => {
  const dir = fakeLibrary();
  assert.equal(libraryDir({ REFERENCE_LIBRARY: dir }), dir);
  assert.equal(libraryDir({ REFERENCE_LIBRARY: join(dir, 'nothing') }), null);
  assert.equal(libraryDir({}, join(dir, 'no-home')), null, 'no ~/projects/reference-library under that home');
});

test('a question goes to the library\'s search as given, and its exit code comes back', () => {
  const dir = fakeLibrary();
  const found = run(['--similar', 'TL072', '--kind', 'op-amp'], { REFERENCE_LIBRARY: dir });
  assert.equal(found.status, 0);
  assert.match(found.stdout, /^from: files --similar TL072 --kind op-amp$/m);
  assert.equal(run(['--part', 'X1', '--missing'], { REFERENCE_LIBRARY: dir }).status, 1, 'not in the library: exit 1 passes through');
});

test('with no library it exits 4 and says how to clone one', () => {
  const none = run(['--part', 'CEM3374'], { REFERENCE_LIBRARY: join(tmpdir(), 'no-such-library') });
  assert.equal(none.status, 4);
  assert.match(none.stderr, /no reference library at .*Clone it/);
});
