// resident/index: the repetition index, kept on the daemon's main thread (review-2-go 2.5). A worker never holds it and never gets
// it: it fingerprints the text it was given and asks by message which files hold any of those fingerprints, and the answer is the
// statements of those files only. The index is built when first asked and rebuilt, from the files' mtimes, after a tool call that
// may have written (a PostToolUse event marks it stale), so a write and a second write repeating it, served by another worker, see
// the first.
import { repoIndex } from '../lib/repo-index.mjs';
const WRITES = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash']);
/** Whether a PostToolUse event of this tool may have changed files. */
export const mayHaveWritten = (tool) => tool !== undefined && WRITES.has(tool);
export function residentIndex(root, layout) {
    let built = null;
    let dirty = true;
    const fresh = () => {
        if (built === null || dirty) {
            built = repoIndex(root, [], layout());
            dirty = false;
        }
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
