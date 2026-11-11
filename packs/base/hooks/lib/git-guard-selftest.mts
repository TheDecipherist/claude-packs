// git-guard's selftest: the token law and the house laws, read from the hook's own exports, then the pushed laws (KWB-26,
// pushed-selftest.mts), the owner-push laws (KWB-157) and the trunk law (KWB-96, trunk-lag-selftest.mts), each on a real repo.
// A selftest module is left out of the repo lint's no-process gates (d-20): it runs as a process.
import { lagCases } from './trunk-lag-selftest.mts';
import { ownerCases, pushedCases } from './pushed-selftest.mts';
import type { Unpushed } from './push-form.mts';
import type { Failure, GitGuards } from './remote-heads.mts';
import type { VerdictRow } from './types.d.mts';

/** What the house laws ask of the machine, planted here so no case starts git or gh. */
export interface HouseEnv {
  dirty: (here: string) => string[];
  branch: (here: string) => string | null;
  hasHead: (here: string) => boolean;
  login: () => string;
  remoteUrl?: (here: string, remote: string) => string | null;
  merging?: (here: string) => boolean;
  unpushed?: (here: string, cfg: GitGuards) => Unpushed | Failure | null;
  warn?: (message: string) => void;
}

/** git-guard's `problem` (the token law) and `house` (the house laws): the refusal's text, or null. */
export interface GitGuardLaws {
  problem: (cmd: string) => string | null;
  house: (cmd: string, cwd: string, env: HouseEnv, cfg: GitGuards) => string | null;
}

type Mark = readonly [command: string, env: HouseEnv];

export function selftest(hookFile: string, { problem, house }: GitGuardLaws): number {
  const bad: string[] = [];
  // the token law (Sub37 WB-3)
  const tokenCases: readonly (readonly [string, boolean])[] = [
    ['git push -u https://x-access-token:abc@github.com/a/b.git work/x', true],
    ['git push --set-upstream https://me:$TOKEN@github.com/a/b.git main', true],
    ['cd ../b && git -C ../b push origin x -u https://u:p@github.com/a/b.git', true],
    ['git remote set-url origin https://ghp_abc@github.com/a/b.git', true],
    ['git remote add o https://u:${T}@github.com/a/b.git', true],
    ['git clone https://x-access-token:abc@github.com/a/b.git', true],
    ['git config remote.origin.url https://u:t@github.com/a/b.git', true],
    // KWB-101: a wrapper in front of git hid the call
    ['T=$(gh auth token) && timeout 100 git push -q -u "https://x-access-token:$T@github.com/a/b.git" work/x', true],
    ['nice -n 5 git clone https://u:p@github.com/a/b.git', true],
    ['sudo -u me timeout -k 5 60 git remote add o https://u:${T}@github.com/a/b.git', true],
    ['timeout 100 git push https://x-access-token:$T@github.com/a/b.git work/x', false],
    ['git push https://x-access-token:$T@github.com/a/b.git work/x', false],
    ['git push -u origin work/x', false],
    ['git remote set-url origin https://github.com/a/b.git', false],
    ['git remote add o git@github-house:HouseOwner/b.git', false],
    ['git clone https://me@github.com/a/b.git', false],
    ['echo https://u:p@x.com/y', false],
  ];
  for (const [cmd, block] of tokenCases) if ((problem(cmd) !== null) !== block) bad.push(`token law: ${cmd}`);
  if (problem('git push -u https://u:SECRET@h/x.git b')?.includes('SECRET')) bad.push('the refusal prints the token');

  // the house laws
  // login: gh's account planted, so no case starts gh (it writes its state into the home: `new`'s "nothing global")
  const isDirty: HouseEnv = { dirty: () => [' M design/gen_panel.py'], branch: () => 'step/C1-the-ribbon', hasHead: () => true, login: () => 'selftest-account' };
  const clean: HouseEnv = { ...isDirty, dirty: () => [] };
  // KWB-147: only untracked entries (a worktree's node_modules link, the status line's own state file): an undo of tracked files never touches them
  const untrackedOnly: HouseEnv = { ...isDirty, dirty: () => ['?? node_modules', '?? .claude/statusbar-activity.json'] };
  const on = (branch: string | ((here: string) => string), env: HouseEnv = clean): HouseEnv => ({ ...env, branch: typeof branch === 'function' ? branch : () => branch });
  const push = 'git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/HouseOwner/app.git main';
  const remote = (url: string): HouseEnv => ({ ...clean, remoteUrl: () => url });   // a remote whose URL is url (KWB-39: SSH names the repo)
  const mustBlock: readonly Mark[] = [
    ['git add -A', clean], ['git add .', clean], ["git commit -am 'x'", clean], ['git add ~/firmware/korg/m1.bin', clean],
    ['git -C /Users/someone/projects/other add -A', clean], ['cd ~/projects/other && git add -A', clean],
    ['cd ~/projects/other && git checkout -- tools/bank/kept.json', isDirty],
    ['git checkout -- design/gen_panel.py', isDirty], ['git stash', isDirty], ['git restore .', isDirty], ['git reset --hard HEAD~1', isDirty],
    ['git clean -fd', isDirty], ['git clean -fd', untrackedOnly], ['GUARD_OK=1 git checkout -- x.h', isDirty], ['GUARD_OK=1 git restore build/Testing/Temporary/LastTest.log', isDirty],
    ['GUARD_OK=1 git restore --staged --worktree a.md', isDirty], ['git restore --staged --worktree a.md', isDirty],
    ['git push', clean], ['git push origin main', clean], [`${push} --force`, clean],
    ['git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/other-org/app.git main', clean],
    ['gh repo create HouseOwner/app --private', clean],
    ['source ~/.env && GH_TOKEN=$PERSONAL_GITHUB_TOKEN gh repo create app --private', clean],
    ['git remote add origin https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/HouseOwner/app.git', clean],
    [`git push https://x-access-token:ghp_${'a'.repeat(30)}@github.com/HouseOwner/app.git main`, clean],
    ['git branch -D step/C1-x', clean], ['git push origin --delete step/C1-x', clean], ['git rebase main', clean], ['git commit --amend -m x', clean],
    ["git commit -q -m 'bench' --no-verify", clean], ['GUARD_OK=1 git commit --no-verify -m x -- a.h', clean],
    ['git push --no-verify https://x@github.com/HouseOwner/app.git main', clean],
    ['git push -u origin work/x', remote('git@github.com:other-org/app.git')], ['git push origin work/x', remote('https://github.com/HouseOwner/app.git')],
    ['git push git@github.com:other-org/app.git work/x', clean], ['git push -f origin work/x', remote('git@github.com:HouseOwner/app.git')],
    ['git checkout --theirs a.txt', isDirty],
  ];
  const mustPass: readonly Mark[] = [
    ['git add build.md src/Row.h', isDirty], ["git commit -m 'C1: row clock' -- build.md src/Row.h", isDirty],
    ['cd ~/projects/other && git add tools/bank/kept.json', isDirty], ['git status', isDirty], ['git checkout -- x.h', clean],
    ['git checkout -- x.h', untrackedOnly], ['git checkout work/1.9.0-x', untrackedOnly], ['git stash', untrackedOnly], ['git reset --hard HEAD', untrackedOnly],
    ['git restore --staged x.h', isDirty], ['python3 tools/safe_restore.py x.h', isDirty], ['git stash list', isDirty],
    ['git checkout -b c2-filter', isDirty], [push, isDirty],
    ['source ~/.env && GH_TOKEN=$PERSONAL_GITHUB_TOKEN gh repo create HouseOwner/app --private', clean],
    ['cmake --build build --target Synth_Standalone -j8', isDirty], ['git log --oneline -6 | sed -n 1,3p', isDirty],
    ["git branch --list 'step/U5*' | tr -d ' *'", isDirty], ["grep -n 'def push' tools/step.py", isDirty], ["echo 'git push origin main'", isDirty],
    ["python3 - <<'EOF'\nprint('git add -A')\nEOF", isDirty],
    ['git push -u origin work/x', remote('git@github.com:HouseOwner/app.git')], ['git push origin work/x', remote('git@github-house:HouseOwner/app.git')],
    ['git push git@github.com:HouseOwner/app.git work/x', clean], ['git push ssh://git@github.com/HouseOwner/app.git work/x', clean],
    ['git add -n .', clean], ['git add --dry-run -A', clean], ['git checkout --theirs a.txt', { ...isDirty, merging: () => true }],
  ];
  const OWNED: GitGuards = { owner: 'HouseOwner' };
  for (const [cmd, env] of mustBlock) if (house(cmd, '.', env, OWNED) === null) bad.push(`NOT BLOCKED: ${cmd}`);
  for (const [cmd, env] of mustPass) { const r = house(cmd, '.', env, OWNED); if (r !== null) bad.push(`WRONGLY BLOCKED: ${cmd} -> ${r}`); }
  const TRUNK: GitGuards = { refuseTrunk: true };
  for (const cmd of ["git commit -m 'x' -- a.h", "GUARD_OK=1 git commit -m 'x' -- a.h"]) if (house(cmd, '.', on('main'), TRUNK) === null) bad.push(`NOT BLOCKED on trunk: ${cmd}`);
  if (house('git rev-parse HEAD^{commit}', '.', on('main'), TRUNK) !== null) bad.push('a word in an argument read as a commit on the trunk');
  if (house("git commit -m 'x' -- a.h", '.', on('main'), {}) !== null) bad.push('a commit on main with the trunk refusal off (the default)');
  if (house("git commit -m 'first' -- a.h", '.', { ...on('main'), hasHead: () => false }, TRUNK) !== null) bad.push('the first commit');
  const byDir = on((c) => (c.endsWith('wt') ? 'work/x' : 'main'));
  if (house('cd /r/wt && git commit --no-edit', '/r', byDir, TRUNK) !== null) bad.push('a commit after cd into a worktree on a branch');
  if (house('git -C /r/wt commit --no-edit', '/r', byDir, TRUNK) !== null) bad.push('git -C a worktree on a branch');
  if (house('cd /r && git commit --no-edit', '/r/wt', byDir, TRUNK) === null) bad.push('cd onto the trunk then commit');
  // WB-107: an agent's isolated worktree cannot push (its harness refuses), so push-then-commit is the lead's there; elsewhere it holds
  const ahead: HouseEnv = { ...on('work/x'), unpushed: () => ({ branch: 'work/x', remote: 'origin', url: 'https://github.com/HouseOwner/app.git', commits: [{ sha: 'abc1234', subject: 'x' }] }) };
  if (house('git commit -m x -- a.h', '/r/.claude/worktrees/agent-a1b2', ahead, {}) !== null) bad.push('a commit in an agent worktree with its branch ahead of GitHub (WB-107)');
  if (house('git commit -m x -- a.h', '/r/.claude/worktrees/night', ahead, {}) === null) bad.push('NOT BLOCKED: a commit in a lead worktree with its branch ahead of GitHub');
  if (house('git commit -m x -- a.h', '/r', ahead, {}) === null) bad.push('NOT BLOCKED: a commit in the main checkout with its branch ahead of GitHub');
  const other: GitGuards = { owner: 'Acme', tokenVar: 'ACME_TOKEN', trunks: ['trunk'], safeRestore: 'python3 tools/safe_restore.py <paths>', branchStart: 'python3 tools/step.py start <STEP> "task"', refuseTrunk: true };
  const own: readonly (readonly [string, HouseEnv, string | null])[] = [
    ['git push https://x-access-token:$ACME_TOKEN@github.com/Acme/app.git b', clean, null], [push, clean, 'Acme'],
    ['git commit -m x -- a', on('trunk'), 'tools/step.py'], ['git commit -m x -- a', on('main'), null], ['git stash', isDirty, 'safe_restore.py'],
  ];
  for (const [cmd, env, want] of own) {
    const r = house(cmd, '.', env, other);
    if ((r === null) !== (want === null) || (want !== null && r !== null && !r.includes(want))) bad.push(`with a project's own values: ${cmd} -> ${r}`);
  }
  const grouped: readonly (readonly [string, VerdictRow[]])[] = [
    ['pushed law', pushedCases(hookFile)],   // KWB-26: a real repo and a bare "GitHub" beside it
    ['owner pushes', ownerCases(hookFile)],  // guards.git.pushNeedsYes (KWB-157)
    ['trunk law', lagCases(hookFile)],       // the trunk a landing leaves behind in the main checkout (KWB-96)
  ];
  for (const [name, cases] of grouped) for (const [label, got, want] of cases) if (got !== want) bad.push(`${name}: ${label} (got ${got}, wanted ${want})`);
  for (const b of bad) console.error(`git-guard selftest FAILED: ${b}`);
  if (bad.length) return 1;
  const n = (name: string): number => grouped.find(([g]) => g === name)?.[1].length ?? 0;
  const counts = [
    `${tokenCases.length + 1} token cases`, `${mustBlock.length + 7} house refusals`, `${mustPass.length + 4} passes`,
    `${n('pushed law')} pushed-law cases`, `${n('owner pushes')} owner-push cases`, `${n('trunk law')} trunk-law cases`,
  ];
  console.log(`git-guard selftest: OK (${counts.join(', ')})`);
  return 0;
}
