// git-guard's selftest for the trunk a landing leaves behind (KWB-96), on lib/hub-rig.mts's scratch repo and bare "GitHub",
// CLAUDE_PROJECT_DIR the main checkout:
//   a worktree lands (pushes its branch and HEAD to the trunk) and Stop is refused while the main checkout's trunk lags, the
//   refusal naming the fast-forward; with uncommitted work in the main checkout, or another branch held there, Stop goes
//   ahead and the user is told nothing was touched; fast-forwarded, Stop passes; a trunk commit pushed from another clone
//   (one this repo does not have) is not judged.
// A selftest module is left out of the repo lint's no-process gates (d-20): it runs as a process.
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gitRun } from './git-run.mjs';
import { hubRepo } from './hub-rig.mjs';
const IDENTITY = { name: 'selftest', email: 'selftest@local' };
/** The cases of git-guard's trunk-lag law, run against the hook file: [label, got, wanted] each. */
export function lagCases(hookFile) {
    const { top, dir, hub, commit, push, run } = hubRepo('git-guard-lag-');
    const git = (cwd, ...args) => { gitRun(args, { cwd, env: process.env, identity: IDENTITY }); };
    const wt = join(dir, '.claude/worktrees/land');
    commit('first');
    push('main');
    git(dir, 'worktree', 'add', '-q', '-b', 'work/land', wt);
    commit('landed', wt);
    git(wt, 'push', '-q', 'origin', 'work/land');
    git(wt, 'push', '-q', 'origin', 'HEAD:refs/heads/main'); // the landing from a worktree
    const stop = (cwd = wt) => run(hookFile, { hook_event_name: 'Stop', stop_hook_active: false }, cwd);
    const cases = [];
    const s1 = stop();
    cases.push(['a landing from a worktree left the main checkout behind: Stop is refused', s1.status, 2]);
    cases.push(['the refusal names the main checkout and its fast-forward', s1.stderr.includes(`git -C ${dir} merge --ff-only origin/main`) && /1 commit\(s\) behind/.test(s1.stderr), true]);
    cases.push(['the same, the Stop from the main checkout itself: refused', stop(dir).status, 2]);
    writeFileSync(join(dir, 'first.txt'), 'edited, not committed\n');
    const s2 = stop();
    cases.push(['the main checkout has uncommitted work: Stop goes ahead, nothing touched', s2.status, 0]);
    cases.push(['and the user is told why the landing is not done', /uncommitted work \(.*first\.txt\).*nothing there was touched/.test(s2.stdout), true]);
    writeFileSync(join(dir, 'first.txt'), 'first');
    writeFileSync(join(dir, 'untracked.log'), 'a log\n');
    cases.push(['an untracked file is not uncommitted work: refused', stop().status, 2]);
    git(dir, 'switch', '-q', '-c', 'work/side');
    push('work/side');
    const s3 = stop();
    cases.push(['the main checkout holds another branch: Stop goes ahead, the user told', s3.status === 0 && /holds work\/side, not main/.test(s3.stdout), true]);
    git(dir, 'switch', '-q', 'main');
    git(dir, 'fetch', '-q', 'origin');
    git(dir, 'merge', '-q', '--ff-only', 'origin/main');
    const s4 = stop();
    cases.push(['fast-forwarded: Stop passes, nothing said about the trunk', s4.status === 0 && !/behind/.test(s4.stdout + s4.stderr), true]);
    const elsewhere = join(top, 'elsewhere');
    git(top, 'clone', '-q', hub, elsewhere);
    commit('from-elsewhere', elsewhere);
    git(elsewhere, 'push', '-q', 'origin', 'main');
    cases.push(['a trunk commit pushed from another clone, which this repo lacks: not judged', stop().status, 0]);
    rmSync(top, { recursive: true, force: true });
    return cases;
}
