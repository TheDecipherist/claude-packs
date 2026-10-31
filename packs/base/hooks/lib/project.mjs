// Every project hook judges only this project's own files. Claude regularly edits sibling
// projects from one session (rolling a lesson out to every synth), and those edits must never be
// blocked by this project's laws; the other project's own hooks govern it there.
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

export const ROOT = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

export function insideProject(path, base = process.cwd()) {
  if (!path) return false;
  const rel = relative(ROOT, resolve(base, path));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

// True when a shell command moves to another folder outside this project (cd, pushd, git -C,
// make -C), so its relative paths are not ours to judge.
export function commandLeavesProject(command = '') {
  for (const m of command.matchAll(/(?:^|[;&|]\s*|\s)(?:cd|pushd)\s+(['"]?)([^\s;&|'"]+)\1/g)) if (!insideProject(m[2].replace(/^~(?=\/)/, process.env.HOME ?? '~'))) return true;
  for (const m of command.matchAll(/\b(?:git|make|ninja|cmake)\s+(?:--build\s+)?-C\s+(['"]?)([^\s;&|'"]+)\1/g)) if (!insideProject(m[2])) return true;
  return false;
}

// The checkout a file belongs to: the nearest folder above it holding `.git` (a folder in the main
// checkout, a file in a git worktree). Agents work in worktrees under .claude/worktrees/, and
// CLAUDE_PROJECT_DIR still points at the main checkout there, so judging a worktree file against
// ROOT made every path look misplaced (Stellix WB-41 and WB-55: agents routed new code into
// unrelated files for days). Every hook measures paths and reads layout.json from this root.
export function checkoutRoot(file) {
  if (!file) return ROOT;
  let dir = resolve(process.cwd(), file);
  dir = existsSync(dir) && !dir.endsWith('/') ? dirname(dir) : dirname(dir);
  for (;;) {
    if (existsSync(resolve(dir, '.git'))) return dir;
    if (dir === ROOT) return ROOT; // a project that is not a git repo is never judged from a parent repo
    const up = dirname(dir);
    if (up === dir) return ROOT;
    dir = up;
  }
}

// The folder whose .claude/ (layout.json, checks, locks) governs a file: its own checkout when that
// checkout carries a layout.json, else the main project. A worktree branch that moved a folder or
// added a check is judged by its own copy; a worktree without one still gets the main laws.
export function claudeRoot(file) {
  const root = checkoutRoot(file);
  return existsSync(resolve(root, '.claude', 'layout.json')) ? root : ROOT;
}

// A path relative to its own checkout, with forward slashes.
export function relInCheckout(file) {
  return relative(checkoutRoot(file), resolve(process.cwd(), file)).replace(/\\/g, '/');
}
