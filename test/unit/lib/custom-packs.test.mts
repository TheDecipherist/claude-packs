// lib/custom-packs.mts: a team's pack repository is scaffolded, fetched into a cache and registered; a bad url is refused.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { addCustomPack, newPack } from '../../../lib/custom-packs.mts';
import { readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { gitRun } from '../../../packs/base/hooks/lib/git-run.mts';

const quiet = { log: (): void => {}, env: { ...process.env, CLAUDE_PACKS_CACHE: join(scratchDir('cp-cache-'), 'cache') } };

test('newPack scaffolds a pack repository with one commit, and refuses a bad name or an existing folder', () => {
  const dir = scratchDir('cp-new-');
  assert.equal(newPack(dir, 'acme-internal', { ...quiet, repo: 'git@host:t/acme.git' }), 0);
  const pack = JSON.parse(readText(join(dir, 'acme-internal/packs/acme-internal/pack.json')) ?? '{}');
  assert.equal(pack.type, 'custom');
  assert.equal(pack.repository.url, 'git@host:t/acme.git');
  const count = gitRun(['rev-list', '--count', 'HEAD'], { cwd: join(dir, 'acme-internal'), env: process.env });
  assert.equal(count.stdout.trim(), '1');
  assert.throws(() => newPack(dir, 'acme-internal', quiet), /already exists/);
  assert.throws(() => newPack(dir, 'Bad Name', quiet), /name the pack in lower case/);
});

test('addCustomPack fetches the repository by url, records the commit, and registers the pack', () => {
  const dir = scratchDir('cp-add-');
  newPack(dir, 'acme-internal', { ...quiet, repo: `file://${join(dir, 'acme-internal')}` });
  const lines: string[] = [];
  const got = addCustomPack('acme-internal', `file://${join(dir, 'acme-internal')}`, { ...quiet, log: (l) => lines.push(l) });
  assert.match(got.commit, /^[0-9a-f]{40}$/);
  assert.match(lines.join('\n'), /acme-internal 0\.1\.0 by .+ from file:/);
});

test('addCustomPack refuses a missing name and a url that is an option (a planted wrong input)', () => {
  assert.throws(() => addCustomPack('', 'file:///x', quiet), /name the pack/);
  assert.throws(() => addCustomPack('x', '--upload-pack=evil', quiet), /not a git url/);
});
