// `npm run release` (1.6.1, rebuilt in the typescript order's W9): the next version, the CHANGELOG section dated and read, what is
// refused, and the order of the steps. Judged here without git, npm or GitHub; the plants that run a release are in
// test/integration/release.test.mts.
import { assert, test } from '../kit-cli.mts';
import { gitWithToken, githubRemote, refusals } from '../../scripts/release-state.mts';
import { ESTIMATED_S, STEPS } from '../../scripts/release-steps.mts';
import { bump, datedChangelog, notesFor, scratchProblems } from '../../scripts/release-version.mts';
import { parseArgs } from '../../scripts/release.mts';

const CHANGELOG = '# Changelog\n\n## Unreleased\n\n- next\n\n## 1.6.1 (2026-11-10)\n\n- the release script\n- the disclaimer\n\n## 1.6.0 (2026-11-09)\n\n- the planner\n';

test('the release notes are the version\'s own CHANGELOG section, and a missing or empty one is refused', () => {
  assert.equal(notesFor(CHANGELOG, '1.6.1'), '- the release script\n- the disclaimer');
  assert.equal(notesFor(CHANGELOG, '1.6.0'), '- the planner', 'the last section runs to the end');
  assert.throws(() => notesFor(CHANGELOG, '1.7.0'), /no "## 1\.7\.0" section/);
  assert.throws(() => notesFor('## 1.6.2\n\n## 1.6.1\n- x\n', '1.6.2'), /is empty/);
  assert.throws(() => notesFor(CHANGELOG, '1.6'), /no "## 1\.6" section/, 'a version is matched whole, never as a prefix');
});

test('the next version is the trunk\'s bumped by the kind, plain x.y.z only', () => {
  assert.deepEqual((['patch', 'minor', 'major'] as const).map((k) => bump('1.9.0', k)), ['1.9.1', '1.10.0', '2.0.0']);
  assert.throws(() => bump('2.0.0-next.1', 'patch'), /not x\.y\.z/);
});

test('the heading is dated from "unreleased" (its own or a bare one); a dated heading is already done; an empty section refuses', () => {
  const own = '# C\n\n## 2.0.0 (unreleased: work/2.0.0-typescript)\n\n- all of it\n\n## 1.9.0 (unreleased: work/1.9.0-platforms)\n\n- before\n';
  const dated = datedChangelog(own, '2.0.0', '2026-11-12');
  assert.equal(dated.changed, true);
  assert.match(dated.text, /^## 2\.0\.0 \(2026-11-12\)$/m);
  assert.match(dated.text, /^## 1\.9\.0 \(unreleased/m, 'another version\'s heading stays');
  assert.equal(datedChangelog(dated.text, '2.0.0', '2026-11-13').changed, false, 'run again, nothing changes');
  assert.match(datedChangelog(CHANGELOG, '1.7.0', '2026-11-12').text, /^## 1\.7\.0 \(2026-11-12\)$/m, 'a bare Unreleased heading takes the version');
  assert.throws(() => datedChangelog('# C\n\n## Unreleased\n\n## 1.0.0 (2026-01-01)\n\n- x\n', '1.0.1', '2026-11-12'), /is empty/);
  assert.throws(() => datedChangelog('# C\n\n## 1.0.0 (2026-01-01)\n\n- x\n', '1.0.1', '2026-11-12'), /no "## 1\.0\.1" section/);
});

test('GitHub is reached over HTTPS with the token from the environment, never through an SSH origin (KWB-143)', () => {
  assert.equal(githubRemote('git@github.com:TheDecipherist/claude-packs.git'), 'https://github.com/TheDecipherist/claude-packs.git');
  assert.equal(githubRemote('https://github.com/TheDecipherist/claude-packs'), 'https://github.com/TheDecipherist/claude-packs.git');
  assert.throws(() => githubRemote('git@gitlab.com:a/b.git'), /not a GitHub remote/);
  const args = gitWithToken('push', 'https://github.com/a/b.git', 'v1.0.0').join(' ');
  assert.match(args, /credential\.helper=!f\(\) \{ echo username=x-access-token; echo "password=\$GH_TOKEN"; \}; f/);
  assert.doesNotMatch(args, /ssh|git@/, 'no SSH');
});

const READY = { branch: 'work/x', dirty: false, token: true, changelog: '', remoteMain: 'abc1234', remoteHead: 'abc1234', scratchProblems: [], landed: false };

test('a release is refused with no token, on a dirty tree, with no fetched trunk and with a CHANGELOG problem; a dry run needs no token', () => {
  assert.deepEqual(refusals(READY), []);
  assert.match(refusals({ ...READY, token: false }).join(), /GH_TOKEN is not set/);
  assert.deepEqual(refusals({ ...READY, token: false }, { dryRun: true }), []);
  assert.deepEqual(refusals({ ...READY, token: false }, { scratch: true }), [], 'a rehearsal never reaches GitHub, so it needs no token');
  assert.match(refusals({ ...READY, dirty: true }).join(), /uncommitted/);
  assert.match(refusals({ ...READY, remoteMain: '', remoteHead: '' }).join(), /not fetched/);
  assert.match(refusals({ ...READY, remoteHead: 'fff0000aaa' }).join(), /is not the remote's main/, 'the local trunk is not the remote head (W10 review 7)');
  assert.match(refusals({ ...READY, remoteHead: '' }).join(), /the remote has no main/);
  assert.match(refusals({ ...READY, changelog: 'CHANGELOG.md\'s "## 2.0.0" section is empty' }).join(), /is empty/);
  assert.deepEqual(refusals({ ...READY, changelog: 'is empty', landed: true }), [], 'a landed release needs no section to date');
  assert.match(refusals({ ...READY, branch: 'HEAD' }).join(), /detached/);
});

test('a rehearsal is refused a public registry and a GitHub remote', () => {
  assert.deepEqual(scratchProblems('http://localhost:4873', '/tmp/scratch/remote.git'), []);
  assert.match(scratchProblems('https://registry.npmjs.org/', '/tmp/r.git').join(), /public registry/);
  assert.match(scratchProblems('http://localhost:4873', 'https://github.com/a/b.git').join(), /is GitHub/);
  assert.match(scratchProblems('http://registry.npmjs.org', 'git@github.com:a/b.git').join(), /public registry[^]*is GitHub/);
});

test('the steps run in the order of the work order, each with an estimate, and the command line names the kind', () => {
  assert.deepEqual(STEPS.map((s) => s.id), ['gate', 'bump', 'changelog', 'generators', 'proxy', 'land', 'verify', 'publish', 'tag', 'release']);
  for (const s of STEPS) assert.ok(ESTIMATED_S[s.id] > 0, s.id);
  const now = new Date('2026-11-12T10:00:00Z');
  assert.deepEqual(parseArgs(['major', '--dry-run'], '/k', now), { root: '/k', kind: 'major', dryRun: true, date: '2026-11-12' });
  assert.deepEqual(parseArgs(['patch', '--registry', 'http://localhost:4873', '--remote', 'scratch'], '/k', now), { root: '/k', kind: 'patch', dryRun: false, date: '2026-11-12', registry: 'http://localhost:4873', remote: 'scratch' });
  const other = parseArgs(['major', '--dry-run', '--root', '/other'], '/k', now);
  assert.ok(typeof other !== 'string');
  assert.equal(other.root, '/other', '--root plans another checkout');
  assert.match(String(parseArgs([], '/k', now)), /^usage/);
  assert.match(String(parseArgs(['patch', '--registry'], '/k', now)), /needs a url/);
});
