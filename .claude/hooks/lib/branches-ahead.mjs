// branches-ahead: which branches hold commits GitHub lacks (KWB-26), for git-guard before a commit (`unpushed`) and at Stop
// (`localBranches`). The heads GitHub holds come from remote-heads.mts; the folder and the environment are the caller's.
//   forRepo(cwd, env, projectDir, cfg) -> cfg, without guards.git.repo when cwd is another repo
//   unpushed(cwd, env, branch, cfg) -> null | { error } | { branch, remote, url, commits: [{ sha, subject }] }
//   localBranches(cwd, env, cfg) -> null | { error } | [{ branch, url, missing, ahead }]   (only the ones not on GitHub)
//   othersBranches(cwd, env) -> Set of branches checked out in another checkout of this repo (not judged here)
//   ownerPushes(cfg, branch) -> whether only the owner pushes this branch
import { resolve } from 'node:path';
import { gitOut } from './git-run.mjs';
import { gitAt, knownShas, ownCommits, target, urlOf, withHeads } from './remote-heads.mjs';
const commonDir = (dir, env) => {
    const d = gitOut(['rev-parse', '--git-common-dir'], gitAt(dir, env));
    return d ? resolve(dir, d) : null;
};
/** guards.git.repo names the project's own repo: a command in another repo is not judged against it (KWB-48; it told a repo with
 *  no remote to push its history into the project's repo). A worktree of the project shares its git dir, so it stays judged. */
export function forRepo(cwd, env, projectDir, cfg = {}) {
    return cfg.repo && commonDir(cwd, env) !== commonDir(projectDir, env) ? { ...cfg, repo: null } : cfg;
}
export function unpushed(cwd, env, branch, cfg = {}) {
    if (!branch || branch === 'HEAD' || gitOut(['rev-parse', '-q', '--verify', 'HEAD'], gitAt(cwd, env)) === null)
        return null;
    const { remote } = target(cwd, env, branch);
    if (!urlOf(cwd, env, remote, cfg))
        return null; // no remote and no guards.git.repo: nothing to compare with
    return withHeads(cwd, env, remote, cfg, (h) => {
        const commits = ownCommits(cwd, env, 'HEAD', h.heads);
        return commits?.length ? { branch, remote, url: h.url, commits } : null;
    });
}
/** The branches checked out in another checkout of this repo: each is its own session's to push (KWB-88: unattended sessions
 *  were charged at Stop for each other's branches). An agent's worktree (.claude/worktrees/agent-*) cannot push, so its lead keeps it. */
export function othersBranches(cwd, env) {
    const top = gitOut(['rev-parse', '--show-toplevel'], gitAt(cwd, env));
    const list = gitOut(['worktree', 'list', '--porcelain'], gitAt(cwd, env));
    const others = new Set();
    for (const entry of (list ?? '').split('\n\n')) {
        const path = entry.match(/^worktree (.+)$/m)?.[1];
        const branch = entry.match(/^branch refs\/heads\/(.+)$/m)?.[1];
        if (path && branch && path !== top && !/\/\.claude\/worktrees\/agent-[^/]+$/.test(path))
            others.add(branch);
    }
    return others;
}
/** Whether only the owner pushes this branch: every branch with guards.git.pushNeedsYes (KWB-157), the trunk with trunkNeedsYes. */
export const ownerPushes = (cfg, branch) => !!cfg.pushNeedsYes || (!!cfg.trunkNeedsYes && branch !== null && (cfg.trunks ?? []).includes(branch));
/** With guards.git.pushNeedsYes the list is what to tell, not what to push: every branch, the trunk with them, and only those
 *  holding commits no GitHub branch has (one missing there by name only risks nothing) (KWB-157). */
export function localBranches(cwd, env, cfg = {}) {
    // every branch, its commit and its upstream in one call
    const r = gitOut(['for-each-ref', '--format=%(refname:short)%09%(objectname)%09%(upstream:remotename)%09%(upstream:remoteref)', 'refs/heads'], gitAt(cwd, env));
    if (r === null)
        return null;
    const byRemote = new Map();
    const others = othersBranches(cwd, env);
    const told = !!cfg.pushNeedsYes;
    for (const [branch, sha, up, ref] of r.split('\n').filter(Boolean).map((l) => l.split('\t'))) {
        if (!branch || !sha)
            continue;
        if (!told && ownerPushes(cfg, branch))
            continue; // only the owner pushes it
        if (others.has(branch))
            continue;
        const remote = up && up !== '.' ? up : 'origin';
        const name = up && up !== '.' && ref ? ref.replace(/^refs\/heads\//, '') : branch;
        byRemote.set(remote, [...(byRemote.get(remote) ?? []), { branch, sha, name }]);
    }
    const found = [];
    for (const [remote, branches] of byRemote) {
        if (!urlOf(cwd, env, remote, cfg))
            continue;
        const f = withHeads(cwd, env, remote, cfg, (h) => {
            const off = [];
            let have = null;
            for (const { branch, sha: local, name } of branches) {
                const sha = h.heads.get(name);
                if (!sha && !told) {
                    off.push({ branch, url: h.url, missing: true });
                    continue;
                }
                if (local === sha)
                    continue;
                have ??= knownShas(cwd, env, h.heads);
                const ahead = ownCommits(cwd, env, branch, h.heads, have)?.length ?? 0;
                if (ahead)
                    off.push({ branch, url: h.url, ahead, missing: !sha });
            }
            return off.length ? off : null;
        });
        if (f && 'error' in f)
            return f;
        if (f)
            found.push(...f);
    }
    return found;
}
