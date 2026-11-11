// shell-sed.mts: the in-place editors of a shell command, read; a sed -i plan run on a copy of the text.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inPlaceFiles, runSed, sedPlan } from '../../../packs/base/hooks/lib/shell-sed.mts';

test('sedPlan takes scripts, files and the options that change reading, GNU and BSD forms alike', () => {
  assert.deepEqual(sedPlan(['-i', 's/a/b/', 'f.txt']), { plan: { flags: [], scripts: ['s/a/b/'] }, files: ['f.txt'] });
  assert.deepEqual(sedPlan(['-i', '', '-E', 's/a/b/', 'f']), { plan: { flags: ['-E'], scripts: ['s/a/b/'] }, files: ['f'] });
  assert.deepEqual(sedPlan(['-ie', 's/a/b/', '-e', 's/c/d/', 'f']).plan?.scripts, ['s/a/b/', 's/c/d/']);
  assert.deepEqual(sedPlan(['-i', '--expression=p', 'f', 'g']), { plan: { flags: [], scripts: ['p'] }, files: ['f', 'g'] });
});

test('a script read from a file is no plan, because it is not read', () => {
  const r = sedPlan(['-i', '-f', 'script.sed', 'f']);
  assert.equal(r.plan, null);
  assert.deepEqual(r.files, ['f']);
});

test('perl and ruby -i give their files, never the program', () => {
  assert.deepEqual(inPlaceFiles(['-pi', '-e', 's/a/b/', 'x', 'y']), ['x', 'y']);
  assert.deepEqual(inPlaceFiles(['-ne', 'print']), []);
});

test('runSed edits the text where GNU sed is there, and refuses a planted write command', () => {
  const out = runSed({ flags: [], scripts: ['s/a/b/'] }, 'a\n');
  assert.ok(out === null || out === 'b\n', 'GNU sed gave b, or none is installed');
  assert.equal(runSed({ flags: [], scripts: ['w /tmp/should-not-exist'] }, 'a\n'), null, '--sandbox refuses w');
});
