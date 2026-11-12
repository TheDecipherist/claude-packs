// asked-index: the repetition index as the resident runner's main thread answers it for one event (KWB-201). template-law judged a write against
// the whole index, read, statted and written back in a worker on every call; here the worker names what the event's writes hold (a statement
// hash, an element shape, a definition name) and gets back only the files that share one, as an index of those files alone. The judge then reads
// it as it read the whole one: a file with none of the keys can match none of the laws.
//   askedIndex(event, ctx) -> RepoIndex | null   null: no daemon to ask (the one-shot runner), or a write lands in a worktree, whose tree the
//   daemon's index is not (the caller reads the checkout's own index)
import { extname, relative } from 'node:path';
import { slash } from './files.mjs';
import { matchesAny } from './glob.mjs';
import { checkoutRoot, insideProject } from './project.mjs';
import { EXTS, defKey, shapeKey, shapesOfText } from './repo-index.mjs';
import { writesOf } from './writes.mjs';
/** The keys of what the event's source writes hold, or null when one of them is not in the daemon's tree. */
function keysOfWrites(event, ctx) {
    const keys = new Set();
    for (const w of writesOf(event, event.cwd ?? ctx.cwd, ctx.env)) {
        if (w.op === 'delete' || w.after === null || !EXTS.has(extname(w.path)) || !insideProject(ctx.projectDir, w.path, ctx.cwd))
            continue;
        const root = checkoutRoot(ctx.projectDir, w.path, ctx.cwd);
        if (root !== checkoutRoot(ctx.projectDir, null, ctx.cwd))
            return null;
        const held = shapesOfText(w.after, slash(relative(root, w.path)));
        for (const [hash] of held.st)
            keys.add(hash);
        for (const s of held.shapes)
            keys.add(shapeKey(s.id));
        for (const [name] of held.defs)
            keys.add(defKey(name));
    }
    return keys;
}
export async function askedIndex(event, ctx) {
    if (!ctx.candidates)
        return null;
    const keys = keysOfWrites(event, ctx);
    if (keys === null)
        return null;
    const index = {};
    if (keys.size === 0)
        return index;
    for (const f of await ctx.candidates([...keys])) {
        index[f.file] = {
            m: 0, s: 0, st: [...f.st],
            shapes: (f.shapes ?? []).map(([id, line, what]) => [id, line, what]),
            defs: (f.defs ?? []).map(([name, line]) => [name, line]),
        };
    }
    return index;
}
/** The entries a judge may compare with: a file under a skipped folder or matching a skip glob is no other copy (the index the daemon holds keeps every file). */
export function without(index, skip) {
    const skipped = (file) => file.split('/').some((_, i, parts) => matchesAny(parts.slice(0, i + 1).join('/'), skip));
    return Object.fromEntries(Object.entries(index).filter(([file]) => !skipped(file)));
}
