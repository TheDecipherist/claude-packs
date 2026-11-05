// git-guard's selftest for the pushed laws (KWB-26), on a real repo whose "GitHub" is a bare repo beside it. The hook runs
// the way Claude Code runs it (through run-hooks.mjs, the event on stdin, CLAUDE_PROJECT_DIR set):
//   a commit on a branch whose earlier commits are not on the remote is refused; pushed, it passes; a branch's first
//   commit passes; a push earlier in the same command counts; the remote out of reach lets it through with a warning;
//   Stop is refused while a local branch is ahead of the remote or missing there, and passes once all are pushed;
//   the refusals name the push and never offer deleting a branch; three identical Stop refusals end the session.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { git, put } from './selftest.mjs';
import { remoteHeads } from './pushed.mjs';

const RUNNER = fileURLToPath(new URL('../run-hooks.mjs', import.meta.url));

export function pushedCases(hookFile) {
  const top = realpathSync(mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'git-guard-pushed-')));
  const dir = join(top, 'repo');
  const hub = join(top, 'hub.git');
  const session = `selftest-${process.pid}-${Date.now()}`;
  put(join(dir, '.claude/layout.json'), JSON.stringify({ folders: {}, guards: { git: { house: true } } }));
  git(top, 'init', '-q', '--bare', '-b', 'main', hub);
  git(top, 'init', '-q', '-b', 'main', dir);
  git(dir, 'remote', 'add', 'origin', hub);
  const commit = (msg) => { writeFileSync(join(dir, `${msg}.txt`), msg); git(dir, 'add', `${msg}.txt`); git(dir, 'commit', '-q', '-m', msg); };
  const push = (...b) => git(dir, 'push', '-q', 'origin', ...b);
  const run = (payload) => spawnSync(process.execPath, [RUNNER, hookFile], {
    cwd: dir, encoding: 'utf8', input: JSON.stringify({ session_id: session, cwd: dir, ...payload }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
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
  const byUrl = spawnSync(process.execPath, [RUNNER, hookFile], { cwd: lone, encoding: 'utf8', input: JSON.stringify({ session_id: session, cwd: lone, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit --allow-empty -m c' } }), env: { ...process.env, CLAUDE_PROJECT_DIR: lone } });
  cases.push(['no remote, guards.git.repo named: its unpushed commits refuse the next commit', byUrl.status, 2]);

  // KWB-48: another repo with no remote, the project's layout naming the project's own repo: nothing to compare with
  const other = join(top, 'other');
  git(top, 'init', '-q', '-b', 'work/o', other);
  git(other, 'commit', '-q', '--allow-empty', '-m', 'a');
  git(other, 'commit', '-q', '--allow-empty', '-m', 'b');
  const foreign = spawnSync(process.execPath, [RUNNER, hookFile], { cwd: other, encoding: 'utf8', input: JSON.stringify({ session_id: session, cwd: other, hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'git commit --allow-empty -m c' } }), env: { ...process.env, CLAUDE_PROJECT_DIR: lone } });
  cases.push(["a repo with no remote is not judged against the project's guards.git.repo", foreign.status, 0]);
  // Stop: work/x is ahead, work/y was never pushed
  git(dir, 'switch', '-q', '-c', 'work/y');
  const s1 = stop();
  cases.push(['Stop with a branch ahead and one missing: refused', s1.status, 2]);
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
