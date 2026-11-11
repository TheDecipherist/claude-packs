// resident/index: the repetition index, kept on the daemon's main thread (review-2-go 2.5). A worker never holds it and never gets
// it: it fingerprints the text it was given and asks by message which files hold any of those fingerprints, and the answer is the
// statements of those files only. The index is built when first asked and rebuilt, from the files' mtimes, after a tool call that
// may have written (a PostToolUse event marks it stale), so a write and a second write repeating it, served by another worker, see
// the first.
import { repoIndex, type RepoIndex } from '../lib/repo-index.mts';
import type { FileStatements } from '../lib/near-copies.mts';
import type { Layout } from '../lib/types.d.mts';

export interface ResidentIndex {
  /** The files that hold any of the statement hashes, with their statements. */
  candidates: (hashes: readonly string[]) => FileStatements[];
  /** A tool call may have written: the next query reads the files' mtimes again. */
  stale: () => void;
  /** Files indexed now (0 before the first query). */
  size: () => number;
}

const WRITES = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash']);
/** Whether a PostToolUse event of this tool may have changed files. */
export const mayHaveWritten = (tool: string | undefined): boolean => tool !== undefined && WRITES.has(tool);

export function residentIndex(root: string, layout: () => Layout): ResidentIndex {
  let built: RepoIndex | null = null;
  let dirty = true;
  const fresh = (): RepoIndex => {
    if (built === null || dirty) { built = repoIndex(root, [], layout()); dirty = false; }
    return built;
  };
  return {
    candidates: (hashes) => {
      const wanted = new Set(hashes);
      return Object.entries(fresh()).flatMap(([file, entry]) => (entry.st.some(([h]) => wanted.has(h)) ? [{ file, st: entry.st }] : []));
    },
    stale: () => { dirty = true; },
    size: () => (built === null ? 0 : Object.keys(built).length),
  };
}
