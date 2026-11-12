// git-guard's selftest for the pushed laws (KWB-26), on a real repo whose "GitHub" is a bare repo beside it. The hook runs
// the way Claude Code runs it (through run-hooks.mjs, the event on stdin, CLAUDE_PROJECT_DIR set):
//   a commit on a branch whose earlier commits are not on the remote is refused; pushed, it passes; a branch's first
//   commit passes; a push earlier in the same command counts; the remote out of reach lets it through with a warning;
//   Stop is refused while a local branch is ahead of the remote or missing there, and passes once all are pushed;
//   the refusals name the push and never offer deleting a branch; three identical Stop refusals end the session.
// A selftest module is left out of the repo lint's no-process gates (d-20): it runs as a process.
import { renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { hubRepo } from './hub-rig.mjs';
import { parseJson, toJson } from './json.mjs';
import { pushCommand, remoteHeads } from './pushed.mjs';
import { git, put } from './selftest.mjs';
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
    put(join(lone, '.claude/layout.json'), toJson({ folders: {}, guards: { git: { house: true, repo: hub } } }));
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
    const h = remoteHeads(dir, process.env, 'origin');
    cases.push(['a look the last one clears makes no network call (the cache)', 'heads' in h && h.cached && h.heads.get('work/y') !== undefined, true]);
    // the remote out of reach: the work goes ahead with a warning
    commit('three');
    git(dir, 'remote', 'set-url', 'origin', join(top, 'gone.git'));
    const off = bash(C);
    cases.push(['GitHub out of reach: the commit goes ahead', off.status, 0]);
    cases.push(['and the user is told it was not checked', /could not be reached/.test(off.stdout), true]);
    cases.push(['GitHub out of reach: Stop goes ahead with a warning', stop().status, 0]);
    // the house laws off: nothing judged
    git(dir, 'remote', 'set-url', 'origin', hub);
    put(join(dir, '.claude/layout.json'), toJson({ folders: {} }));
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
    put(join(dir, '.claude/layout.json'), toJson({ folders: {}, guards: { git: { house: true, trunkNeedsYes: true, pushNeedsYes: true, stopLiveMs: 20_000 } } }));
    const bash = (command) => runAt(hookFile, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
    const stop = () => runAt(hookFile, { hook_event_name: 'Stop', stop_hook_active: false });
    const told = (r) => parseJson(r.stdout)?.systemMessage ?? '';
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
// The Pre Bash law never waits on the network (W-budgets): it reads the kept look and the local remote-tracking refs. A push by
// URL moves no local ref, so the hook's sight of the push command sends the next commit to GitHub once; with none seen, GitHub
// is out of reach for the law, which then judges from what this machine holds.
export function offlineCases(hookFile) {
    const { top, dir, hub, commit, push, run: runAt } = hubRepo('git-guard-offline-');
    const bash = (command) => runAt(hookFile, { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
    const cases = [];
    const C = "git commit -m 'next' -- a.txt";
    const away = `${hub}.away`;
    commit('first');
    push('main');
    git(dir, 'switch', '-q', '-c', 'work/x');
    commit('one');
    cases.push(['an unpushed commit: the next commit is refused', bash(C).status, 2]);
    git(dir, 'push', '-q', hub, 'work/x'); // by URL: no tracking ref moves, the kept look is old
    renameSync(hub, away);
    const blind = bash(C);
    cases.push(['GitHub away, no push seen: judged from this machine alone, with no network call and no warning', blind.status === 2 && !/could not be reached/.test(blind.stdout + blind.stderr), true]);
    renameSync(away, hub);
    cases.push(['the push command seen: the next commit is looked up once and passes', bash(`git push ${hub} work/x`).status, 0]);
    cases.push(['and the commit after the push passes (the look is kept)', bash(C).status, 0]);
    renameSync(hub, away);
    cases.push(['and once kept, GitHub away changes nothing', bash(C).status, 0]);
    renameSync(away, hub);
    commit('two');
    git(dir, 'push', '-q', 'origin', 'work/x'); // by name: the tracking ref answers
    renameSync(hub, away);
    cases.push(['pushed by name, GitHub away: the tracking ref clears the commit', bash(C).status, 0]);
    renameSync(away, hub);
    rmSync(top, { recursive: true, force: true });
    return cases;
}
