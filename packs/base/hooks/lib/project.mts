// Every project hook judges only this project's own files. Claude regularly edits sibling
// projects from one session (rolling a lesson out to every project), and those edits must never be
// blocked by this project's laws; the other project's own hooks govern it there.
// Nothing here reads the process (typescript order W3.3, d-19): every function takes the project's root, and the folder a
// relative path is measured from where it matters, from its caller (the event's own, never this process's).
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slash } from './files.mts';

/** A path's real folder (links resolved), or its resolved self when it does not exist. */
export const real = (p: string): string => { try { return realpathSync(p); } catch { return resolve(p); } };

/** True when this module's file `url` is the program node was started with (never when the runner or another module imports it). */
export const isMain = (url: string): boolean => Boolean(process.argv[1]) && real(process.argv[1] ?? '') === real(fileURLToPath(url));

/** True when `path`, measured from `base`, is inside the project at `root`. */
export function insideProject(root: string, path: string | null | undefined, base: string): boolean {
  if (!path) return false;
  const rel = relative(resolve(root), resolve(base, path));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

// True when a shell command moves to another folder outside this project (cd, pushd, git -C,
// make -C), so its relative paths are not ours to judge. `home` is the caller's HOME, for a `~` path.
export function commandLeavesProject(root: string, command: string, base: string, home: string | undefined): boolean {
  for (const m of command.matchAll(/(?:^|[;&|]\s*|\s)(?:cd|pushd)\s+(['"]?)([^\s;&|'"]+)\1/g)) if (!insideProject(root, (m[2] ?? '').replace(/^~(?=\/)/, home ?? '~'), base)) return true;
  for (const m of command.matchAll(/\b(?:git|make|ninja|cmake)\s+(?:--build\s+)?-C\s+(['"]?)([^\s;&|'"]+)\1/g)) if (!insideProject(root, m[2], base)) return true;
  return false;
}

// The checkout a file belongs to: the project itself, or a git worktree of it. Agents work in
// worktrees under .claude/worktrees/, and CLAUDE_PROJECT_DIR still points at the main checkout there,
// so judging a worktree file against the root made every path look misplaced (Stellix WB-41 and WB-55:
// agents routed new code into unrelated files for days). Every hook measures paths and reads
// layout.json from this root.
// Only a worktree of THIS repo counts: a `.git` file whose gitdir lies in this repo's worktrees/.
// Any other nested `.git` (FetchContent's JUCE clone under build/_deps, a vendored repo, a
// submodule) is part of the project and judged by it; stopping there let an edit inside
// build/_deps/juce-src escape protect-vendor (Sub37 WB-2).
const gitdirOf = (dir: string): string | undefined => readFileSync(resolve(dir, '.git'), 'utf8').match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();

/** The git folder a checkout shares with its worktrees; null when `root` is no git checkout. */
export function commonGitDir(root: string): string | null {
  const dotGit = resolve(root, '.git');
  try {
    if (statSync(dotGit).isDirectory()) return real(dotGit);
    const named = gitdirOf(root);
    if (named === undefined) return null;
    const gitdir = resolve(root, named);
    const common = resolve(gitdir, existsSync(resolve(gitdir, 'commondir')) ? readFileSync(resolve(gitdir, 'commondir'), 'utf8').trim() : '.');
    return real(common);
  } catch {
    return null;
  }
}

/** True when `dir` is a git worktree of the project at `root`. */
export function isWorktreeOfProject(root: string, dir: string): boolean {
  try {
    if (!statSync(resolve(dir, '.git')).isFile()) return false;
    const named = gitdirOf(dir);
    if (named === undefined) return false;
    const gitdir = real(resolve(dir, named));
    const common = commonGitDir(resolve(root));
    return common !== null && gitdir.startsWith(`${common}/worktrees/`);
  } catch {
    return false;
  }
}

/** The checkout a file belongs to: its worktree of the project, else the project's own root. `base` is where a relative file is measured from. */
export function checkoutRoot(root: string, file: string | null | undefined, base: string): string {
  const top = resolve(root);
  if (!file) return top;
  let dir = dirname(resolve(base, file));
  for (;;) {
    if (dir === top) return top; // a project that is not a git repo is never judged from a parent repo
    if (isWorktreeOfProject(top, dir)) return dir;
    const up = dirname(dir);
    if (up === dir) return top;
    dir = up;
  }
}

// The folder whose .claude/ (layout.json, checks, locks) governs a file: its own checkout when that
// checkout carries a layout.json, else the main project. A worktree branch that moved a folder or
// added a check is judged by its own copy; a worktree without one still gets the main laws.
export function claudeRoot(root: string, file: string | null | undefined, base: string): string {
  const own = checkoutRoot(root, file, base);
  return existsSync(resolve(own, '.claude', 'layout.json')) ? own : resolve(root);
}

// A path relative to its own checkout, with forward slashes.
export function relInCheckout(root: string, file: string, base: string): string {
  return slash(relative(checkoutRoot(root, file, base), resolve(base, file)));
}
