// resident/index: the repetition indexes, kept on the daemon's main thread (review-2-go 2.5). A worker never holds one and never gets
// one: it asks by message which files hold any of the keys it names (a statement's hash, an element shape's `shape:<id>`, a definition's
// `def:<name>`; and `dup:<window hash>` of the duplicate index, resident/dup-windows.mts), and the answer is those files' entries only. The index is built when first asked and rebuilt, from the files' mtimes,
// after a tool call that may have written (a PostToolUse event marks it stale), so a write and a second write repeating it, served by
// another worker, see the first. A key is looked up in a map built with the index, not found by a walk of every file per question (KWB-201).
import { dupWindows } from './dup-windows.mjs';
import { defKey, repoIndex, shapeKey } from '../lib/repo-index.mjs';
const WRITES = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash']);
/** Whether a PostToolUse event of this tool may have changed files. */
export const mayHaveWritten = (tool) => tool !== undefined && WRITES.has(tool);
/** key -> the files that hold it. */
function keysOf(index) {
    const by = new Map();
    for (const [file, entry] of Object.entries(index)) {
        const mine = new Set([...entry.st.map(([h]) => h), ...entry.shapes.map(([id]) => shapeKey(id)), ...entry.defs.map(([name]) => defKey(name))]);
        for (const key of mine) {
            const files = by.get(key);
            if (files)
                files.push(file);
            else
                by.set(key, [file]);
        }
    }
    return by;
}
export function residentIndex(root, layout) {
    let built = null;
    let dirty = true;
    const fresh = () => {
        if (built === null || dirty) {
            const index = repoIndex(root, [], layout());
            built = { index, keys: keysOf(index) };
            dirty = false;
        }
        return built;
    };
    const dup = dupWindows(root, layout);
    const repoOf = (wanted) => {
        const { index, keys } = fresh();
        const files = new Set(wanted.flatMap((k) => keys.get(k) ?? []));
        return [...files].flatMap((file) => { const e = index[file]; return e ? [{ file, st: e.st, shapes: e.shapes, defs: e.defs }] : []; });
    };
    return {
        // a question names either kind of key; the index it does not ask is not built for it
        candidates: (wanted) => [...(wanted.some((k) => !k.startsWith('dup:')) ? repoOf(wanted) : []), ...dup.find(wanted)],
        stale: () => { dirty = true; dup.stale(); },
        size: () => (built === null ? 0 : Object.keys(built.index).length),
    };
}
