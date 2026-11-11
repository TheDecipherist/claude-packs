// trunk-lag: the main checkout a landing left behind (KWB-96). A landing done from a worktree pushes the branch to the remote
// trunk (`git push origin HEAD:refs/heads/main`: a worktree cannot switch to a trunk the main checkout holds), proves it with
// ls-remote and stops; the main checkout, the folder the user reads, is never fast-forwarded (matrix12, 2026-11-08: about 30
// commits behind GitHub all day). git-guard reads this at Stop, beside the unpushed branches (stop-verdict.mts `stopVerdict`).
// The main checkout is the first entry of `git worktree list`. For each trunk it has (guards.git.trunks):
//   - the remote's trunk head is a commit this repo lacks: pushed from elsewhere, nothing landed here: not judged;
//   - the main checkout's trunk already contains it: in step;
//   - the main checkout holds the trunk with no uncommitted change to a tracked file: refused, with the fast-forward to run;
//   - it holds another branch, or has uncommitted work: nothing may be touched there (land-branch), so the user is told and
//     the session is not sent back for what it may not do. Untracked files do not count: `merge --ff-only` refuses on its own
//     if one would be overwritten.
// The remote's heads come from remote-heads.mts `withHeads` (the last look first, live before a refusal), so a fast-forward made
// seconds ago is seen at once and a Stop in step makes no network call.
//   trunkLag(cwd, env, cfg) -> null | { error } | { refuse: text } | { warn: text }
import { gitLines, gitOut, gitRun } from './git-run.mts';
import { gitAt, target, withHeads } from './remote-heads.mts';
import type { GitEnv, GitGuards } from './remote-heads.mts';

/** What the lag says: nothing, a failure, a refusal (a fix the session can make) or a warning (the user's to act on). */
export interface LagVerdict { error?: string; refuse?: string; warn?: string }

/** The main checkout: its path, the branch it holds (null when detached) and its tracked files with uncommitted changes. */
export interface MainCheckout { path: string; holds: string | null; dirty: string[] }

const has = (cwd: string, env: GitEnv, sha: string): boolean => gitRun(['cat-file', '-e', `${sha}^{commit}`], gitAt(cwd, env)).ok;
const contains = (cwd: string, env: GitEnv, ref: string, sha: string): boolean => gitRun(['merge-base', '--is-ancestor', sha, ref], gitAt(cwd, env)).ok;

export function mainCheckout(cwd: string, env: GitEnv): MainCheckout | null {
  const first = (gitOut(['worktree', 'list', '--porcelain'], gitAt(cwd, env)) ?? '').split('\n\n')[0] ?? '';
  const path = first.match(/^worktree (.+)$/m)?.[1];
  if (!path || /^bare$/m.test(first)) return null;
  const holds = first.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? null;
  const dirty = gitLines(['--no-optional-locks', 'status', '--porcelain', '--untracked-files=no'], gitAt(path, env)).map((l) => l.slice(3)); // a line's first column may be a space
  return { path, holds, dirty };
}

export function trunkLag(cwd: string, env: GitEnv, cfg: GitGuards = {}): LagVerdict | null {
  const main = mainCheckout(cwd, env);
  if (!main) return null;
  for (const trunk of cfg.trunks ?? ['main', 'master']) {
    const local = gitOut(['rev-parse', '-q', '--verify', `refs/heads/${trunk}`], gitAt(main.path, env));
    if (!local) continue;
    const { remote } = target(main.path, env, trunk);
    const found = withHeads<{ sha: string; url: string }>(main.path, env, remote, cfg, (h) => {
      const sha = h.heads.get(trunk);
      return !sha || !has(main.path, env, sha) || contains(main.path, env, local, sha) ? null : { sha, url: h.url };
    });
    if (!found) continue;
    if ('error' in found) return found;
    const behind = gitOut(['rev-list', '--count', `${local}..${found.sha}`], gitAt(main.path, env)) ?? '?';
    const where = `The main checkout (${main.path}) has ${trunk} at ${local.slice(0, 7)}, ${behind} commit(s) behind ${found.url}'s ${trunk} (${found.sha.slice(0, 7)})`;
    if (main.holds === trunk && !main.dirty.length) {
      return { refuse: `${where}: a landing pushed the trunk and left the folder the user reads behind (KWB-96). Bring it up to date, then prove it:\n` +
        `  git -C ${main.path} fetch ${remote}\n  git -C ${main.path} merge --ff-only ${remote}/${trunk}\n  git -C ${main.path} rev-parse HEAD   (equals ${found.sha.slice(0, 7)})` };
    }
    const why = main.holds === trunk ? `it has uncommitted work (${main.dirty.slice(0, 3).join(', ')})` : `it holds ${main.holds ?? 'a detached HEAD'}, not ${trunk}`;
    return { warn: `${where}, and ${why}, so nothing there was touched. The landing is not done until the user brings it up to date (KWB-96).` };
  }
  return null;
}
