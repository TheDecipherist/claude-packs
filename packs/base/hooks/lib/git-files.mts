// git-files: what a repo says about itself in its own files, read with no git process (W8.3: a process is 10 to 20 ms, and the
// Stop of seven agents asked for about thirty). The branch a checkout is on, a ref's commit, and the fingerprint of every local
// ref, remote ref, worktree and the config: the key under which git-guard's Stop verdict is kept (stop-cache.mts) and the stamp
// the kept git state is read by (git-state.mts). A read that fails answers null: the caller asks git itself.
//   gitDirsOf(checkout) -> { gitDir, common } | null    (a worktree's .git is a file naming its dir; `commondir` names the shared one)
//   currentHead(dirs) -> { branch: string | null, sha: string | null }   (branch null when detached)
//   refSha(dirs, ref) -> the commit of `refs/...`, `HEAD`, a local branch or `remote/branch`, or null
//   refsFingerprint(dirs) -> a hash of every ref and the config
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readText } from './files.mts';
import { shortHash } from './hash.mts';

export interface GitDirs { gitDir: string; common: string }

/** The git dir of a checkout and the one it shares (the same for a main checkout); null outside a repo. */
export function gitDirsOf(checkout: string): GitDirs | null {
  const dot = join(checkout, '.git');
  let gitDir = dot;
  try {
    if (!statSync(dot).isDirectory()) {
      const pointer = readText(dot)?.match(/^gitdir:\s*(.+)$/m)?.[1];
      if (!pointer) return null;
      gitDir = resolve(checkout, pointer.trim());
    }
  } catch { return null; }
  const common = readText(join(gitDir, 'commondir'))?.trim();
  return { gitDir, common: common ? resolve(gitDir, common) : gitDir };
}

/** The git dirs of the checkout `dir` is in or under (the nearest folder with a `.git`); null outside a repo, and when the environment
 *  names a git dir itself (GIT_DIR, GIT_WORK_TREE: the caller asks git). */
export function findGitDirs(dir: string, env: Readonly<Record<string, string | undefined>>): GitDirs | null {
  if (env['GIT_DIR'] || env['GIT_WORK_TREE']) return null;
  for (let at = resolve(dir); ; at = resolve(at, '..')) {
    const dirs = gitDirsOf(at);
    if (dirs) return dirs;
    if (resolve(at, '..') === at) return null;
  }
}

const SHA = /^[0-9a-f]{40,64}$/;

function packedRefs(common: string): Map<string, string> {
  const refs = new Map<string, string>();
  for (const line of (readText(join(common, 'packed-refs')) ?? '').split('\n')) {
    const m = line.match(/^([0-9a-f]{40,64}) (\S+)$/);
    if (m?.[1] && m[2]) refs.set(m[2], m[1]);
  }
  return refs;
}

/** The commit a full ref name (`refs/heads/x`) names: its loose file, else packed-refs; null when neither has it. */
function fullRef(dirs: GitDirs, name: string): string | null {
  const loose = readText(join(dirs.common, name))?.trim();
  if (loose && SHA.test(loose)) return loose;
  return packedRefs(dirs.common).get(name) ?? null;
}

/** The commits of every remote-tracking ref of `remote` (loose files over packed-refs), keyed by the ref's full name; symbolic refs (origin/HEAD) left out. */
export function trackedRefs(dirs: GitDirs, remote: string): Map<string, string> {
  const prefix = `refs/remotes/${remote}/`;
  const refs = new Map([...packedRefs(dirs.common)].filter(([name]) => name.startsWith(prefix)));
  const loose: string[] = [];
  looseRefs(join(dirs.common, 'refs', 'remotes', remote), prefix, loose);
  for (const line of loose) {
    const at = line.lastIndexOf(' ');
    if (SHA.test(line.slice(at + 1))) refs.set(line.slice(0, at), line.slice(at + 1));
  }
  return refs;
}

export function currentHead(dirs: GitDirs): { branch: string | null; sha: string | null } {
  const head = readText(join(dirs.gitDir, 'HEAD'))?.trim() ?? '';
  const ref = head.match(/^ref:\s*(\S+)$/)?.[1];
  if (!ref) return { branch: null, sha: SHA.test(head) ? head : null };
  return { branch: ref.replace(/^refs\/heads\//, ''), sha: fullRef(dirs, ref) };
}

export function refSha(dirs: GitDirs, ref: string): string | null {
  if (ref === 'HEAD') return currentHead(dirs).sha;
  if (ref.startsWith('refs/')) return fullRef(dirs, ref);
  return fullRef(dirs, `refs/heads/${ref}`) ?? fullRef(dirs, `refs/remotes/${ref}`) ?? fullRef(dirs, `refs/tags/${ref}`);
}

function looseRefs(dir: string, prefix: string, into: string[]): void {
  let names: string[];
  try { names = readdirSync(dir).sort(); } catch { return; }
  for (const name of names) {
    const path = join(dir, name);
    try {
      if (statSync(path).isDirectory()) looseRefs(path, `${prefix}${name}/`, into);
      else into.push(`${prefix}${name} ${(readText(path) ?? '').trim()}`);
    } catch { /* a ref gone between the listing and the read */ }
  }
}

/** Every loose and packed ref under refs/heads and refs/remotes, each worktree's HEAD and the config text, as one hash: it changes
 *  when a branch moves, a push updates a remote ref, a worktree switches branch or a remote's URL changes. */
export function refsFingerprint(dirs: GitDirs): string {
  const { common } = dirs;
  const parts: string[] = [];
  looseRefs(join(common, 'refs', 'heads'), 'refs/heads/', parts);
  looseRefs(join(common, 'refs', 'remotes'), 'refs/remotes/', parts);
  parts.push(`packed ${readText(join(common, 'packed-refs')) ?? ''}`, `HEAD ${(readText(join(common, 'HEAD')) ?? '').trim()}`, `config ${readText(join(common, 'config')) ?? ''}`);
  let trees: string[] = [];
  try { trees = readdirSync(join(common, 'worktrees')).sort(); } catch { /* none */ }
  for (const t of trees) parts.push(`wt ${t} ${(readText(join(common, 'worktrees', t, 'HEAD')) ?? '').trim()} ${(readText(join(common, 'worktrees', t, 'gitdir')) ?? '').trim()}`);
  return shortHash(parts.join('\n'), 20);
}
