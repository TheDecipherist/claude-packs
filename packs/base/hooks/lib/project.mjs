// Every project hook judges only this project's own files. Claude regularly edits sibling
// projects from one session (rolling a lesson out to every synth), and those edits must never be
// blocked by this project's laws; the other project's own hooks govern it there.
import { isAbsolute, relative, resolve } from 'node:path';

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
