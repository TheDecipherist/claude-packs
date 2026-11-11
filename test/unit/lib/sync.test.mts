// lib/sync.mts and lib/switches.mts: an install, the never-overwrite contract, and what switches on.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { readLock } from '../../../lib/manifest.mts';
import { createFolders, sync } from '../../../lib/sync.mts';
import { reportSwitches, switches } from '../../../lib/switches.mts';

const quiet = (): { said: string[]; log: (l: string) => void } => { const said: string[] = []; return { said, log: (l) => said.push(l) }; };

test('a first install writes the lock, the layout and the CLAUDE.md block', async () => {
  const dir = scratchDir('sync-first-');
  const { said, log } = quiet();
  const out = await sync(dir, ['base'], { log });
  assert.ok(out.packNames.includes('base'));
  assert.ok(existsSync(join(dir, '.claude/layout.json')));
  assert.match(readText(join(dir, 'CLAUDE.md')) ?? '', /claude-packs:start/);
  const lock = readLock(join(dir, '.claude'));
  assert.deepEqual(lock.packs.includes('base'), true);
  assert.ok(Object.keys(lock.files).length > 10);
  assert.match(said.join('\n'), /files managed/);
});

test('a file the user edited is kept, and the pack\'s version goes beside it as .pack-new', async () => {
  const dir = scratchDir('sync-keep-');
  await sync(dir, ['base'], { log: () => {} });
  const rule = Object.keys(readLock(join(dir, '.claude')).files).find((f) => f.includes('/rules/'));
  assert.ok(rule);
  put(join(dir, rule), 'my own text\n');
  const { said, log } = quiet();
  await sync(dir, null, { log });
  assert.equal(readText(join(dir, rule)), 'my own text\n');
  assert.ok(existsSync(`${join(dir, rule)}.pack-new`));
  assert.match(said.join('\n'), /you edited/);
});

test('a same-named file the packs never made is kept, never overwritten', async () => {
  const dir = scratchDir('sync-theirs-');
  put(join(dir, '.claude/rules/test-only-what-changed.md'), 'theirs\n');
  await sync(dir, ['base'], { log: () => {} });
  assert.equal(readText(join(dir, '.claude/rules/test-only-what-changed.md')), 'theirs\n');
});

test('a layout.json that is not JSON stops the install before anything is written', async () => {
  const dir = scratchDir('sync-bad-');
  put(join(dir, '.claude/layout.json'), '{ nope');
  await assert.rejects(sync(dir, ['base'], { log: () => {} }), /not valid JSON/);
  assert.ok(!existsSync(join(dir, '.claude/claude-packs.lock.json')));
});

test('createFolders makes the layout\'s folders and not a planned one', () => {
  const dir = scratchDir('sync-folders-');
  createFolders(dir, { folders: { a: { path: 'src/a' }, b: { path: 'later', planned: true } } });
  assert.ok(existsSync(join(dir, 'src/a')));
  assert.ok(!existsSync(join(dir, 'later')));
});

test('a pack the project is choosing switches its hooks on; one it had holds a new hook back until "enable" names it', async () => {
  const dir = scratchDir('sync-switch-');
  const first = await sync(dir, ['base'], { log: () => {} });
  const lock = readLock(join(dir, '.claude'));
  assert.deepEqual(switches(dir, first.packNames, first.layout, lock), { on: [], held: [] });
  const fresh = switches(dir, ['base'], first.layout, { kit: '', packs: [], files: {} });
  assert.deepEqual(fresh.held, []);
  const { said, log } = quiet();
  reportSwitches({ on: ['hooks/a.mjs'], held: ['hooks/b.mjs'] }, log);
  assert.match(said.join('\n'), /switching on.*hooks\/a\.mjs/);
  assert.match(said.join('\n'), /held back.*hooks\/b\.mjs/);
});
