// kit-fresh-look.mts: whether the kit a session runs is the newest: versions compared, npm's answer kept a day, the verdicts at a start and at a commit.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { KIT, atCommit, atStart, cacheDir, compareVersions, isKitRepo, kitVerdict, newestOnNpm, parseVersion, projectVerdict } from '../../../packs/base/hooks/lib/kit-fresh-look.mts';
import type { KitGit, KitGitAnswer, NpmAnswer } from '../../../packs/base/hooks/lib/kit-fresh-look.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';

test('versions parse with or without a v, and compare by number, not text', () => {
  assert.deepEqual(parseVersion('v1.10.2'), [1, 10, 2]);
  assert.equal(parseVersion('latest'), null);
  assert.ok(compareVersions('1.10.0', '1.9.0') > 0);
  assert.equal(compareVersions('2.0.0', '2.0.0'), 0);
  assert.ok(compareVersions('1.0.0', 'junk') > 0, 'a planted unreadable version sorts below a real one');
});

test('the cache folder is the environment\'s when it names one', () => {
  assert.equal(cacheDir({ CLAUDE_PACKS_CACHE_DIR: '/c' }), '/c');
  assert.ok(cacheDir({ XDG_CACHE_HOME: '/x' }).endsWith('claude-packs'));
});

test('npm is asked once a day, a failed ask is kept an hour, and a stale answer is asked again', () => {
  const dir = scratchDir('fresh-');
  let asked = 0;
  const ask = (): NpmAnswer => { asked += 1; return { version: '9.9.9' }; };
  assert.deepEqual(newestOnNpm({ now: 1_000, dir, ask }), { version: '9.9.9' });
  newestOnNpm({ now: 2_000, dir, ask });
  assert.equal(asked, 1);
  newestOnNpm({ now: 1_000 + 25 * 3600 * 1000, dir, ask });
  assert.equal(asked, 2);
  const bad = scratchDir('fresh-bad-');
  const failing = (): NpmAnswer => { asked += 1; return { error: 'offline' }; };
  assert.deepEqual(newestOnNpm({ now: 0, dir: bad, ask: failing }), { error: 'offline' });
  assert.deepEqual(newestOnNpm({ now: 60_000, dir: bad, ask: failing }), { error: 'offline' });
  assert.equal(asked, 3, 'the failure was kept, not asked again within the hour');
});

test('a project on an older kit is told, blocked only when nobody is there; an unanswered ask never blocks', () => {
  const dir = scratchDir('fresh-proj-');
  put(join(dir, 'node_modules', KIT, 'package.json'), toJson({ name: KIT, version: '1.0.0' }));
  put(join(dir, '.claude/claude-packs.lock.json'), toJson({ kit: '1.0.0', packs: [], files: {} }));
  const newer = (): NpmAnswer => ({ version: '1.2.0' });
  const said = projectVerdict(dir, { unattended: false, npm: newer });
  assert.equal(said?.block, false);
  assert.match(said?.say ?? '', /runs the kit 1\.0\.0, and npm has 1\.2\.0/);
  assert.equal(projectVerdict(dir, { unattended: true, npm: newer })?.block, true);
  assert.equal(projectVerdict(dir, { unattended: true, npm: () => ({ error: 'x' }) })?.block, false);
  assert.equal(projectVerdict(dir, { unattended: true, npm: () => ({ version: '1.0.0' }) }), null);
  assert.equal(projectVerdict(scratchDir('fresh-none-'), { unattended: true, npm: newer }), null, 'no kit installed, nothing to compare');
});

const answers = (table: Record<string, KitGitAnswer>): KitGit => (...args) => table[args[0] ?? ''] ?? { ok: false, out: '', err: '' };

test('the kit\'s own checkout lacking origin/main refuses a commit; a planted one that has it is clear', () => {
  const dir = scratchDir('fresh-kit-');
  put(join(dir, 'package.json'), toJson({ name: KIT, version: '2.0.0' }));
  assert.equal(isKitRepo(dir), true);
  const behind = answers({ fetch: { ok: true, out: '', err: '' }, 'rev-parse': { ok: true, out: 'work/2.0.0-x', err: '' }, 'for-each-ref': { ok: true, out: '', err: '' }, 'merge-base': { ok: false, out: '', err: '' } });
  assert.equal(kitVerdict(dir, { git: behind, fetch: false })?.refuseCommit, true);
  assert.match(atCommit(dir, 'git commit -m x', { env: {}, git: behind }) ?? '', /lacks newer work: origin\/main/);
  assert.equal(atCommit(dir, 'git status', { env: {}, git: behind }), null, 'not a commit');
  const level = answers({ fetch: { ok: true, out: '', err: '' }, 'rev-parse': { ok: true, out: 'main', err: '' }, 'for-each-ref': { ok: true, out: '', err: '' }, 'merge-base': { ok: true, out: '', err: '' } });
  assert.equal(kitVerdict(dir, { git: level, fetch: false }), null);
  assert.equal(atStart(dir, { env: {}, now: 0, git: level }), null);
});
