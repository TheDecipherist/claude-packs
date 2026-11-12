// For a hook's selftest: the runner's kept git facts (git-state.mts) planted for a scratch checkout, as the selftest's own
// process and the hook it runs both see them (the same TMPDIR). A selftest module runs only under --selftest.
import { currentHead, gitDirsOf } from './git-files.mts';
import { stateFileOf } from './git-state.mts';
import type { TreeEntry } from './git-state.mts';
import { writeJson } from './json.mts';

/** HEAD's commit in a checkout, from its git dir's files. */
export const headOf = (dir: string): string | null => {
  const dirs = gitDirsOf(dir);
  return dirs ? currentHead(dirs).sha : null;
};

/** Keeps `tree` as the files of a checkout's HEAD, taken at `head`: what the hooks read while HEAD is that commit. */
export function plantFacts(dir: string, head: string | null, tree: readonly TreeEntry[]): void {
  writeJson(stateFileOf(dir, process.env), { head, stamp: '', at: Date.now(), dirty: [], tree });
}
