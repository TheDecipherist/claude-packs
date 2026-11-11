// git-guard's selftest for the pushed laws (KWB-26), on a real repo whose "GitHub" is a bare repo beside it. The hook runs
// the way Claude Code runs it (through run-hooks.mjs, the event on stdin, CLAUDE_PROJECT_DIR set):
//   a commit on a branch whose earlier commits are not on the remote is refused; pushed, it passes; a branch's first
//   commit passes; a push earlier in the same command counts; the remote out of reach lets it through with a warning;
//   Stop is refused while a local branch is ahead of the remote or missing there, and passes once all are pushed;
//   the refusals name the push and never offer deleting a branch; three identical Stop refusals end the session.
import { renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { git, put } from './selftest.mjs';
import { hubRepo } from './hub-rig.mjs';
import { lagCases } from './trunk-lag-selftest.mjs';
import { pushCommand, remoteHeads } from './pushed.mjs';

export function pushedCases(hookFile) {
  const { top, dir, hub, commit, push, run: runAt } = hubRepo('git-guard-pushed-');
  const run = (payload) => runAt(hookFile, payload);
  const bash = (command) => run({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
  const stop = () => run({ hook_event_name: 'Stop', stop_hook_active: false });
  const cases = [];
  const C = "git commit -m 'next' -- a.txt";

  commit('first');
  push('main');
  git(dir, 'switch', '-q', '-c', 'work/x');
  cases.push(['a new branch\'s first commit passes', bash(C).status, 0]);
  commit('one');
  const r1 = bash(C);
  cases.push(['an earlier commit never pushed: the next commit is refused', r1.status, 2]);
  cases.push(['the refusal names the commit and the push with the token named', /\bone\b/.test(r1.stderr) && /git push https:\/\/x-access-token:\$PERSONAL_GITHUB_TOKEN@github\.com\/\S+ work\/x/.test(r1.stderr), true]);
  cases.push(['the refusal never offers deleting a branch', /branch -[dD]|--delete|delete the branch/.test(r1.stderr), false]);
  cases.push(['a push earlier in the same command counts', bash(`source ~/.env && git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/HouseOwner/repo.git work/x && ${C}`).status, 0]);
  push('work/x');
  cases.push(['pushed seconds after a refusal (the cache is fresh): the commit passes', bash(C).status, 0]);
  commit('two');
  cases.push(['a pushed branch one commit ahead: refused', bash(`cd ${dir} && ${C}`).status, 2]);
  cases.push(['git -C into the repo is judged there', bash(`git -C ${dir} commit -m x -- a.txt`).status, 2]);
  const lone = join(top, 'lone');
  git(top, 'init', '-q', '-b', 'work/z', lone);
  git(lone, 'commit', '-q', '--allow-empty', '-m', 'a');
  git(lone, 'commit', '-q', '--allow-empty', '-m', 'b');
  cases.push(['a repo with no remote has nothing to push to: passes', bash(`git -C ${lone} commit --allow-empty -m c`).status, 0]);
  // a repo that pushes by URL only names its GitHub repo in the layout (guards.git.repo): judged against it
  put(join(lone, '.claude/layout.json'), JSON.stringify({ folders: {}, guards: { git: { house: true, repo: hub } } }));
  const byUrl = runAt(hookFile, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit --allow-empty -m c' } }, lone, lone);
  cases.push(['no remote, guards.git.repo named: its unpushed commits refuse the next commit', byUrl.status, 2]);

  // KWB-48: another repo with no remote, the project's layout naming the project's own repo: nothing to compare with
  const other = join(top, 'other');
  git(top, 'init', '-q', '-b', 'work/o', other);
  git(other, 'commit', '-q', '--allow-empty', '-m', 'a');
  git(other, 'commit', '-q', '--allow-empty', '-m', 'b');
  const foreign = runAt(hookFile, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit --allow-empty -m c' } }, other, lone);
  cases.push(["a repo with no remote is not judged against the project's guards.git.repo", foreign.status, 0]);
  // Stop: work/x is ahead, work/y was never pushed; work/w, never pushed, is another session's: checked out in its worktree (KWB-88)
  git(dir, 'worktree', 'add', '-q', '-b', 'work/w', join(dir, '.claude/worktrees/M9'));
  git(dir, 'switch', '-q', '-c', 'work/y');
  const s1 = stop();
  cases.push(['Stop with a branch ahead and one missing: refused', s1.status, 2]);
  cases.push(["a branch checked out in another session's worktree is that session's, not this one's (KWB-88)", /work\/w/.test(s1.stderr), false]);
  cases.push(['an SSH remote is pushed as itself, whatever the owner (KWB-88)', pushCommand('git@github.com:Any/app.git', ['work/x'], {}), 'git push git@github.com:Any/app.git work/x']);
  cases.push(['the Stop refusal lists both with the push', /work\/x.*1 commit/.test(s1.stderr) && /work\/y.*not on/.test(s1.stderr) && /git push https:\/\/x-access-token:\$PERSONAL_GITHUB_TOKEN@\S+ work\/x work\/y/.test(s1.stderr), true]);
  cases.push(['the Stop refusal never offers deleting a branch', /branch -[dD]|--delete|delete the branch/.test(s1.stderr), false]);
  cases.push(['the same refusal again: still refused', stop().status, 2]);
  stop();
  const s4 = stop();
  cases.push(['the fourth identical refusal ends the session, the list goes to the user', s4.status === 0 && /work\/y/.test(s4.stdout), true]);
  push('work/x', 'work/y');
  cases.push(['every branch pushed: Stop passes', stop().status, 0]);
  const h = remoteHeads(dir, 'origin');
  cases.push(['a look the last one clears makes no network call (the cache)', h.cached === true && h.heads.get('work/y') !== undefined, true]);

  // the remote out of reach: the work goes ahead with a warning
  commit('three');
  git(dir, 'remote', 'set-url', 'origin', join(top, 'gone.git'));
  const off = bash(C);
  cases.push(['GitHub out of reach: the commit goes ahead', off.status, 0]);
  cases.push(['and the user is told it was not checked', /could not be reached/.test(off.stdout), true]);
  cases.push(['GitHub out of reach: Stop goes ahead with a warning', stop().status, 0]);

  // the house laws off: nothing judged
  git(dir, 'remote', 'set-url', 'origin', hub);
  put(join(dir, '.claude/layout.json'), JSON.stringify({ folders: {} }));
  cases.push(['house laws off: an unpushed commit is not judged', bash(C).status, 0]);
  cases.push(['house laws off: Stop is not judged', stop().status, 0]);
  rmSync(top, { recursive: true, force: true });
  return cases;
}
// KWB-157: guards.git.pushNeedsYes, every push the owner's (here with trunkNeedsYes, as a new install has it). No commit and
// no session end waits for a push; at Stop the branches holding commits no GitHub branch has, the trunk with them, are told
// once a session and never refused; a branch missing on GitHub by name only, every commit of it there, is not told.
export function ownerCases(hookFile) {
  const { top, dir, hub, commit, push, run: runAt } = hubRepo('git-guard-owner-');
  put(join(dir, '.claude/layout.json'), JSON.stringify({ folders: {}, guards: { git: { house: true, trunkNeedsYes: true, pushNeedsYes: true } } }));
  const bash = (command) => runAt(hookFile, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
  const stop = () => runAt(hookFile, { hook_event_name: 'Stop', stop_hook_active: false });
  const told = (r) => { try { return JSON.parse(r.stdout).systemMessage ?? ''; } catch { return ''; } };
  const cases = [];
  commit('first');
  push('main');
  git(dir, 'branch', 'work/merged'); // never pushed, every commit of it on GitHub's main
  git(dir, 'switch', '-q', '-c', 'work/x');
  commit('one');
  cases.push(['an earlier commit never pushed: the next commit passes', bash("git commit -m 'next' -- a.txt").status, 0]);
  const s1 = stop();
  cases.push(['Stop with a branch holding a commit GitHub lacks: goes ahead', s1.status, 0]);
  cases.push(['and the user is told the branch and its count', /work\/x: 1 commit/.test(told(s1)), true]);
  cases.push(['a branch missing on GitHub by name only: not told', /work\/merged/.test(told(s1)), false]);
  cases.push(['the note never offers deleting a branch', /branch -[dD]|--delete|delete the branch/.test(told(s1)), false]);
  renameSync(hub, `${hub}.away`); // the same URL, its cache kept: a live look now fails, and would say so
  const s2 = stop();
  renameSync(`${hub}.away`, hub);
  cases.push(['the same again in this session: not told twice', s2.status === 0 && !/work\/x/.test(told(s2)), true]);
  cases.push(['and nothing new to tell is judged by the cached look, with no network call', /could not be reached/.test(told(s2)), false]);
  git(dir, 'switch', '-q', 'main');
  commit('two');
  const s3 = stop();
  cases.push(["the trunk's own commit: the list changed, told again, the trunk in it", s3.status === 0 && /main: 1 commit/.test(told(s3)) && /work\/x/.test(told(s3)), true]);
  push('main', 'work/x');
  const s4 = stop();
  cases.push(['everything pushed: Stop passes, nothing told', s4.status === 0 && told(s4) === '', true]);
  rmSync(top, { recursive: true, force: true });
  return cases;
}
// The token law and the house laws, read from the hook's own exports.
export async function selftest(hookFile, { problem, house }) {
  const bad = [];
  // the token law (Sub37 WB-3)
  const tokenCases = [
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
  const isDirty = { dirty: () => [' M design/gen_panel.py'], branch: () => 'step/C1-the-ribbon', hasHead: () => true, login: () => 'selftest-account' };
  const clean = { ...isDirty, dirty: () => [] };
  // KWB-147: only untracked entries (a worktree's node_modules link, the status line's own state file): an undo of tracked files never touches them
  const untrackedOnly = { ...isDirty, dirty: () => ['?? node_modules', '?? .claude/statusbar-activity.json'] };
  const on = (branch, env = clean) => ({ ...env, branch: typeof branch === 'function' ? branch : () => branch });
  const push = 'git push https://x-access-token:$PERSONAL_GITHUB_TOKEN@github.com/HouseOwner/app.git main';
  const remote = (url) => ({ ...clean, remoteUrl: () => url });   // a remote whose URL is url (KWB-39: SSH names the repo)
  const mustBlock = [
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
  const mustPass = [
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
  const OWNED = { owner: 'HouseOwner' };
  for (const [cmd, env] of mustBlock) if (house(cmd, '.', env, OWNED) === null) bad.push(`NOT BLOCKED: ${cmd}`);
  for (const [cmd, env] of mustPass) { const r = house(cmd, '.', env, OWNED); if (r !== null) bad.push(`WRONGLY BLOCKED: ${cmd} -> ${r}`); }
  const TRUNK = { refuseTrunk: true };
  for (const cmd of ["git commit -m 'x' -- a.h", "GUARD_OK=1 git commit -m 'x' -- a.h"]) if (house(cmd, '.', on('main'), TRUNK) === null) bad.push(`NOT BLOCKED on trunk: ${cmd}`);
  if (house('git rev-parse HEAD^{commit}', '.', on('main'), TRUNK) !== null) bad.push('a word in an argument read as a commit on the trunk');
  if (house("git commit -m 'x' -- a.h", '.', on('main')) !== null) bad.push('a commit on main with the trunk refusal off (the default)');
  if (house("git commit -m 'first' -- a.h", '.', { ...on('main'), hasHead: () => false }, TRUNK) !== null) bad.push('the first commit');
  const byDir = on((c) => (c.endsWith('wt') ? 'work/x' : 'main'));
  if (house('cd /r/wt && git commit --no-edit', '/r', byDir, TRUNK) !== null) bad.push('a commit after cd into a worktree on a branch');
  if (house('git -C /r/wt commit --no-edit', '/r', byDir, TRUNK) !== null) bad.push('git -C a worktree on a branch');
  if (house('cd /r && git commit --no-edit', '/r/wt', byDir, TRUNK) === null) bad.push('cd onto the trunk then commit');
  // WB-107: an agent's isolated worktree cannot push (its harness refuses), so push-then-commit is the lead's there; elsewhere it holds
  const ahead = { ...on('work/x'), unpushed: () => ({ branch: 'work/x', url: 'https://github.com/HouseOwner/app.git', commits: [{ sha: 'abc1234', subject: 'x' }] }) };
  if (house("git commit -m x -- a.h", '/r/.claude/worktrees/agent-a1b2', ahead) !== null) bad.push('a commit in an agent worktree with its branch ahead of GitHub (WB-107)');
  if (house("git commit -m x -- a.h", '/r/.claude/worktrees/night', ahead) === null) bad.push('NOT BLOCKED: a commit in a lead worktree with its branch ahead of GitHub');
  if (house("git commit -m x -- a.h", '/r', ahead) === null) bad.push('NOT BLOCKED: a commit in the main checkout with its branch ahead of GitHub');
  const other = { owner: 'Acme', tokenVar: 'ACME_TOKEN', trunks: ['trunk'], safeRestore: 'python3 tools/safe_restore.py <paths>', branchStart: 'python3 tools/step.py start <STEP> "task"', refuseTrunk: true };
  for (const [cmd, env, want] of [
    ['git push https://x-access-token:$ACME_TOKEN@github.com/Acme/app.git b', clean, null], [push, clean, 'Acme'],
    ['git commit -m x -- a', on('trunk'), 'tools/step.py'], ['git commit -m x -- a', on('main'), null], ['git stash', isDirty, 'safe_restore.py'],
  ]) {
    const r = house(cmd, '.', env, other);
    if ((r === null) !== (want === null) || (want && !r.includes(want))) bad.push(`with a project's own values: ${cmd} -> ${r}`);
  }
  // the pushed laws (KWB-26), on a real repo and a bare "GitHub" beside it
  const pushed = pushedCases(hookFile);
  for (const [label, got, want] of pushed) if (got !== want) bad.push(`pushed law: ${label} (got ${got}, wanted ${want})`);
  const owner = ownerCases(hookFile); // guards.git.pushNeedsYes (KWB-157)
  for (const [label, got, want] of owner) if (got !== want) bad.push(`owner pushes: ${label} (got ${got}, wanted ${want})`);
  // the trunk a landing leaves behind in the main checkout (KWB-96)
  const lag = lagCases(hookFile);
  for (const [label, got, want] of lag) if (got !== want) bad.push(`trunk law: ${label} (got ${got}, wanted ${want})`);
  for (const b of bad) console.error(`git-guard selftest FAILED: ${b}`);
  if (!bad.length) console.log(`git-guard selftest: OK (${tokenCases.length + 1} token cases, ${mustBlock.length + 7} house refusals, ${mustPass.length + 4} passes, ${pushed.length} pushed-law cases, ${owner.length} owner-push cases, ${lag.length} trunk-law cases)`);
  return bad.length ? 1 : 0;
}
