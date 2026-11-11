// git-guard: the house laws of git (no force push, no token in a URL, the trunk and pushes the owner's where the layout says so).
// The hook's contract (its selftest, its worktree case, the emitted verdict equal to the source's), then the refusals that sat in
// the old root test files.
import { join } from 'node:path';
import { house } from '../../../packs/base/hooks/git-guard.mts';
import type { HouseEnv } from '../../../packs/base/hooks/lib/git-guard-selftest.mts';
import { readJson, writeJson } from '../../../packs/base/hooks/lib/json.mts';
import { bash, git, withLayout } from '../../fixtures/installs.mts';
import { assert, existsSync, put, run, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { bashAt, workProject } from '../work-project.mts';

holdsTheContract({
  hook: 'git-guard.mjs',
  dir: () => fixture('audio-core'),
  same: () => ({ payload: bash('git push --force origin work/x'), status: 2 }),
});

const clean: HouseEnv = { dirty: () => [], branch: () => 'main', hasHead: () => true };
const push = (dir: string, command: string) => bashAt(dir, 'git-guard.mjs', command);

/** The project's layout without its `guards`: an install from before the house laws. */
function withoutGuards(dir: string): string {
  const file = join(dir, '.claude/layout.json');
  const layout = readJson<Record<string, unknown>>(file, {}) ?? {};
  writeJson(file, Object.fromEntries(Object.entries(layout).filter(([key]) => key !== 'guards')));
  return file;
}
const guardsOf = (file: string): Record<string, unknown> | undefined => readJson<{ guards?: Record<string, unknown> }>(file)?.guards;

test('KF-10: a dry run stages nothing, in both hooks', () => {
  const dir = workProject('audio-core');
  for (const hook of ['git-guard.mjs', 'stage-guard.mjs']) {
    for (const command of ['git add -n .', 'git add --dry-run -A']) assert.equal(bashAt(dir, hook, command).status, 0, `${hook}: ${command}`);
    assert.equal(bashAt(dir, hook, 'git add .').status, 2, hook);
  }
});

test('KF-21: --theirs during a merge resolves it; outside a merge it is an undo', () => {
  const dir = workProject();
  put(join(dir, 'a.txt'), 'base\n');
  git(dir, 'add', 'a.txt');
  git(dir, 'commit', '-qm', 'base', '--', 'a.txt');
  git(dir, 'switch', '-qc', 'other');
  put(join(dir, 'a.txt'), 'other\n');
  git(dir, 'commit', '-qm', 'other', '--', 'a.txt');
  git(dir, 'switch', '-q', 'work/x');
  put(join(dir, 'a.txt'), 'mine\n');
  git(dir, 'commit', '-qm', 'mine', '--', 'a.txt');
  put(join(dir, 'b.txt'), 'uncommitted\n');
  assert.equal(push(dir, 'git checkout --theirs a.txt').status, 2, 'no merge: an undo');
  try { git(dir, 'merge', '-q', 'other'); } catch { /* the conflict is the point */ }
  assert.equal(push(dir, 'git checkout --theirs a.txt').status, 0);
  assert.equal(push(dir, 'git checkout --ours a.txt').status, 0);
  assert.equal(push(dir, 'git checkout -- a.txt').status, 2, 'a plain checkout is still an undo');
});

test('git rev-parse x^{commit} is no commit: the word in an argument is not the subcommand', () => {
  const dir = workProject();
  withLayout(dir, { guards: { git: { house: true, ghAuth: 'cli', refuseTrunk: true } } });
  put(join(dir, 'a.txt'), 'x\n');
  git(dir, 'add', 'a.txt');
  git(dir, 'commit', '-qm', 'x', '--', 'a.txt');
  git(dir, 'branch', '-qm', 'main');
  assert.equal(push(dir, 'git rev-parse HEAD^{commit}').status, 0);
  assert.equal(push(dir, 'git log --grep commit').status, 0);
  assert.equal(push(dir, 'git -C . commit -m x -- a.txt').status, 2);
});

test('KF-8: a new install has the house laws: a force push is refused on its first day', () => {
  const dir = workProject();
  const guards = guardsOf(join(dir, '.claude/layout.json'))?.['git'] as { house?: unknown; ghAuth?: unknown } | undefined;
  assert.equal(guards?.house, true);
  assert.equal(guards?.ghAuth, 'cli');
  assert.equal(push(dir, 'git push --force origin work/x').status, 2);
});

test('KF-8: an update never switches them on; `enable` does', () => {
  const dir = workProject();
  const layoutFile = withoutGuards(dir);
  run(dir, 'update');
  assert.equal(guardsOf(layoutFile), undefined);
  assert.equal(push(dir, 'git push --force origin work/x').status, 0, 'an existing project is unchanged');
  withLayout(dir, { enable: ['guards/git-house'] });
  assert.equal(push(dir, 'git push --force origin work/x').status, 2);
});

test('KF-8: a re-init of an installed project leaves its guards alone', () => {
  const dir = workProject();
  const layoutFile = withoutGuards(dir);
  run(dir, 'init', '--config', 'base');
  assert.equal(guardsOf(layoutFile), undefined);
});

test('KF-12: with no owner, a push over SSH or through git\'s own login is not refused for naming no token', () => {
  const dir = workProject();
  git(dir, 'remote', 'add', 'origin', 'git@github.com:some-org/app.git');
  assert.equal(push(dir, 'git push origin work/x').status, 0);
  withLayout(dir, { guards: { git: { house: true, ghAuth: 'cli' } } });
  git(dir, 'remote', 'set-url', 'origin', 'https://github.com/some-org/app.git');
  assert.equal(push(dir, 'git push origin work/x').status, 0);
});

test('KF-12: GH_TOKEN naming a variable nothing sets is refused, and the refusal names the way out', () => {
  const dir = workProject();
  withLayout(dir, { guards: { git: { house: true, ghAuth: 'token', tokenVar: 'KF_TOKEN_NOT_SET' } } });
  const r = push(dir, 'GH_TOKEN=$KF_TOKEN_NOT_SET gh pr list');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /KF_TOKEN_NOT_SET is not set/);
  assert.match(r.stderr, /"ghAuth": "cli"/);
  assert.equal(push(dir, 'source ~/.env && GH_TOKEN=$KF_TOKEN_NOT_SET gh pr list').status, 0, 'a command that loads it may set it');
  assert.match(push(dir, 'gh pr list').stderr, /"ghAuth": "cli"/, 'the setting is named where it is needed');
  assert.ok(existsSync(join(dir, '.claude/layout.json')));
});

test('git-guard: gh logged in needs no token named; trunkNeedsYes leaves the trunk to its owner', () => {
  assert.match(house('gh pr list', '.', clean) ?? '', /names the token/);
  assert.equal(house('gh pr list', '.', clean, { ghAuth: 'cli' }), null);
  const waiting: HouseEnv = { ...clean, unpushed: () => ({ branch: 'main', remote: 'origin', url: 'u', commits: [{ sha: 'a', subject: 's' }] }) };
  assert.match(house('git commit -m x -- a', '.', waiting) ?? '', /not on GitHub/);
  assert.equal(house('git commit -m x -- a', '.', waiting, { trunkNeedsYes: true, trunks: ['main'] }), null);
});

test('git-guard: pushNeedsYes leaves every push to the owner, a work branch too (KWB-157)', () => {
  const work: HouseEnv = { ...clean, branch: () => 'work/x', unpushed: () => ({ branch: 'work/x', remote: 'origin', url: 'u', commits: [{ sha: 'a', subject: 's' }] }) };
  assert.match(house('git commit -m x -- a', '.', work, { trunkNeedsYes: true, trunks: ['main'] }) ?? '', /not on GitHub/);
  assert.equal(house('git commit -m x -- a', '.', work, { pushNeedsYes: true }), null);
  assert.match(house('git push -f origin work/x', '.', work, { pushNeedsYes: true }) ?? '', /Never force/);
});

test('WB-3: git-guard refuses a command that writes a token URL into git config', () => {
  const dir = fixture('audio-core');
  const status = (command: string): number | null => bashAt(dir, 'git-guard.mjs', command).status;
  for (const c of [
    'git push -u https://x-access-token:abc123@github.com/TheDecipherist/synthkit.git work/x',
    'git push --set-upstream "https://TheDecipherist:${THEDECIPHERIST_GITHUB_TOKEN}@github.com/TheDecipherist/sub37.git" main',
    'cd ../synthkit && git push origin work/x -u https://u:ghp_abc@github.com/a/b.git',
    'git remote set-url origin https://ghp_abcdef123@github.com/a/b.git',
    'git remote add personal https://TheDecipherist:$TOKEN@github.com/a/b.git',
    'git clone https://x-access-token:abc@github.com/a/b.git',
    'git config remote.origin.url https://u:tok@github.com/a/b.git',
  ]) assert.equal(status(c), 2, c);
  for (const c of [
    'git push https://x-access-token:$TOKEN@github.com/a/b.git work/x',
    'git push -u origin work/x',
    'git remote set-url origin https://github.com/a/b.git',
    'git remote add personal git@github-decipherist:TheDecipherist/b.git',
    'git -c credential.helper=\'!f() { echo password=$T; }; f\' push -u origin work/x',
    'git status',
  ]) assert.equal(status(c), 0, c);
});
