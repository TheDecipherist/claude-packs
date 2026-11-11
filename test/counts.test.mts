// The generated documents (typescript order W7 c, d-8): `node scripts/counts.mts --check` is green on the kit, and a wrong number or a
// stale table planted in a document is seen red. It replaces the README's true-counts, configurations-and-presets, commands and
// base-hooks tests and the site's counts test (test/repo-lint.test.mts held them as readers in test/repo-readers.mts).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandsOf, whenOf } from '../scripts/counts-tables.mts';
import { documentsOf, standing } from '../scripts/counts.mts';
import { totals } from '../scripts/counts-facts.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));

test('counts --check is green: the manifest, the README tables, the site counts and the docs are what the kit generates', () => {
  const r = spawnSync('node', [join(KIT, 'scripts/counts.mts'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('a wrong pack row in the README is seen red, and so is a wrong count on the site', () => {
  const stand = standing(KIT);
  assert.deepEqual(documentsOf(KIT, stand).stale, []);
  const row = /^\| `ai` \| .*? \| (\d+) \|/m.exec(stand['README.md']);
  assert.ok(row !== null, 'the README has the ai row');
  const readme = stand['README.md'].replace(/^(\| `ai` \| .*? \| )\d+( \|)/m, '$1999$2');
  assert.deepEqual(documentsOf(KIT, { ...stand, 'README.md': readme }).stale, ['README.md']);
  const site = stand['site/index.html'].replace(/data-count="rules">\d+</, 'data-count="rules">0<');
  assert.deepEqual(documentsOf(KIT, { ...stand, 'site/index.html': site }).stale, ['site/index.html']);
  assert.ok(totals(KIT).rules > 0);
});

test('a README without its markers, or a base hook with no description, is an error and not a silent rewrite', () => {
  const stand = standing(KIT);
  const noMarkers = stand['README.md'].replace('<!-- generated:presets:start -->', '');
  assert.match(documentsOf(KIT, { ...stand, 'README.md': noMarkers }).errors.join('\n'), /no .*generated:presets/);
  const undescribed = stand['README.md'].replace(/^\| `making` \| .*$/m, '');
  assert.match(documentsOf(KIT, { ...stand, 'README.md': undescribed }).errors.join('\n'), /without a description in the table: making/);
});

test('a stale version in the docs is seen red: the status-line sample, the planner and the versions table follow package.json', () => {
  const stand = standing(KIT);
  assert.deepEqual(documentsOf(KIT, { ...stand, 'README.md': stand['README.md'].replace(/^claude-packs \d+\.\d+\.\d+ \|/m, 'claude-packs 0.0.1 |') }).stale, ['README.md']);
  assert.deepEqual(documentsOf(KIT, { ...stand, 'planner/README.md': stand['planner/README.md'].replace(/Real at \S+,/, 'Real at 0.0.1,') }).stale, ['planner/README.md']);
  assert.deepEqual(documentsOf(KIT, { ...stand, 'docs/versions.md': stand['docs/versions.md'].replace(/\| yaml \|/, '| yaml-x |') }).errors.length, 1);
});

test('the commands come from the help text: usage, the first lines of what it does, never the flag lines', () => {
  const help = ['usage: x', '', '  init [pack...]     install packs', '                     and more', '                     --auto  a flag', '  lock status|take', '                     the lock, a lease', 'options: --dir'].join('\n');
  assert.deepEqual(commandsOf(help), [{ usage: 'init [pack...]', what: 'install packs and more' }, { usage: 'lock status|take', what: 'the lock, a lease' }]);
});

test('a hook says where it runs in the words of the table', () => {
  assert.equal(whenOf({ name: 'x', runs: [{ event: 'PreToolUse', matcher: 'Write|Edit|Bash' }, { event: 'Stop', matcher: undefined }] }), 'Write, Bash, Stop');
  assert.equal(whenOf({ name: 'x', runs: [{ event: 'PreToolUse', matcher: undefined }, { event: 'PostToolUse', matcher: undefined }] }), 'Every call');
});
