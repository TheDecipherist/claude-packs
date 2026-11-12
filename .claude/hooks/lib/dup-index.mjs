// dup-index: once-only's detector at write time (KWB-24). jscpd read the whole repo on every source write; this keeps an
// index instead, built once and updated for the files that changed since, so a write costs one walk of the folders (a stat
// of each source file, no reading) and a lookup, never a rescan.
//   The index: per source file (lib/dup.mts: SOURCE, its excludes, the same files jscpd judged), the hash of every window of
//   WINDOW tokens (comments and blank space left out, as jscpd's mild mode) and the line each token is on; kept in
//   $TMPDIR/claude-packs-dup-index/<checkout>.json, keyed by modification time and size. A file that changed is read again;
//   one that is gone leaves.
//   A candidate clone (lib/dup-match.mts): the windows of the new text that are also in one other file, chained in order along one
//   diagonal, covering a little under jscpd's LIMITS (lib/dup.mts) so the candidates hold every clone jscpd finds.
//   loadIndex(root, { layout, shape }) -> { root, files: { rel: { h, l } }, built, read }   (read: files tokenized this call)
//   clonesIn(index, writes, { ignore }) -> [{ at, other, lines, tokens }]  writes: [{ path, after, range | ranges }] (the changed
//       lines, [lo, hi] each; one write per path), sides { file, start, end }
//   judgeCopyWrites(root, writes, { env, layout, shape, ignore }) -> { clones, error, index }: the index finds the candidates
//       (it is looser than jscpd: a superset, measured on a C++ project's tree), then jscpd confirms on those files alone, so a
//       write is refused when jscpd over the repo would refuse it, and a write with no candidate never starts jscpd. `env` is
//       the caller's (where jscpd is found); nothing here reads the process. (Named for its job: spec-lock has a judgeWrites.)
//   judgeCopyWritesAsked(root, writes, ask, { env, layout, shape, ignore }) -> { clones, error }: the same, with the candidates asked
//       of the resident runner's main thread, which holds the one index (ctx.candidates, `dup:<hash>` keys, KWB-201): a worker keeps none.
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { clonesOf, excludeGlobs, realPath, scan, SOURCE } from './dup.mjs';
import { dupKey, match, prepare, windowHits } from './dup-match.mjs';
import { tokenize, windows } from './dup-tokens.mjs';
import { scratchDir } from './files.mjs';
import { matchesAny } from './glob.mjs';
import { shortHash } from './hash.mjs';
import { parseJson, writeJson } from './json.mjs';
export { tokenize, windows, WINDOW } from './dup-tokens.mjs';
const MAX_BYTES = 512 * 1024; // a table or a blob, not code anyone copies by hand
const VERSION = 1;
// The index file of a checkout, in the system's temp folder (which honours TMPDIR); sha1's first 16 digits, as before.
const fileOf = (root) => join(tmpdir(), 'claude-packs-dup-index', `${shortHash(realPath(root), 16)}.json`);
/** Every source file under root that the index judges: { rel: { m, s } }. Folders an exclude covers are never entered. */
function sourceStats(root, ex) {
    const out = {};
    const go = (dir, rel) => {
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const e of entries) {
            const r = rel ? `${rel}/${e.name}` : e.name;
            if (e.isDirectory()) {
                if (!matchesAny(`${r}/x`, ex) && !matchesAny(`${r}/x/x`, ex))
                    go(join(dir, e.name), r);
                continue;
            }
            if (!e.isFile() || !SOURCE.test(e.name) || matchesAny(r, ex))
                continue;
            try {
                const st = statSync(join(dir, e.name));
                if (st.size <= MAX_BYTES)
                    out[r] = { m: st.mtimeMs, s: st.size };
            }
            catch { /* gone */ }
        }
    };
    go(root, '');
    return out;
}
// What this process last held of a checkout's index (`keep`): the next call starts from it, not from the file, so a call costs the walk of the
// folders and the files that moved, not a parse of the whole index (KWB-201). Only the resident runner's main thread keeps one.
const kept = new Map();
/** The checkout's index, read from the temp folder (or from this process's memory with `keep`) and brought up to date for the files that changed. */
export function loadIndex(root, { layout = {}, shape = null, persist = true, keep = false } = {}) {
    const file = fileOf(root);
    const real = realPath(root);
    // read whole, not through readText: a big checkout's index is past its 8 MB cap
    let text = null;
    const held = keep ? kept.get(file) : undefined;
    if (!held)
        try {
            text = readFileSync(file, 'utf8');
        }
        catch { /* built below */ }
    let old = held ?? parseJson(text);
    if (old?.v !== VERSION || old.root !== real || typeof old.files !== 'object')
        old = null;
    const ex = excludeGlobs(layout, shape);
    const now = sourceStats(root, ex);
    const files = {};
    let read = 0;
    for (const [rel, st] of Object.entries(now)) {
        const was = old?.files[rel];
        if (was && was.m === st.m && was.s === st.s) {
            files[rel] = was;
            continue;
        }
        let source = '';
        try {
            source = readFileSync(join(root, rel), 'utf8');
        }
        catch {
            continue;
        }
        const { t, l } = tokenize(source, rel);
        files[rel] = { m: st.m, s: st.s, h: windows(t), l };
        read += 1;
    }
    const changed = read > 0 || !old || Object.keys(old.files).length !== Object.keys(files).length;
    if (changed && persist) {
        try {
            mkdirSync(join(file, '..'), { recursive: true });
        }
        catch { /* judged all the same */ }
        writeJson(file, { v: VERSION, root: real, files }); // false when refused: judged all the same
    }
    if (keep)
        kept.set(file, { v: VERSION, root: real, files });
    return { root: real, files, built: !old, read };
}
const skipOf = (root, writes, ignore) => new Set([...ignore, ...writes.map((w) => w.path)].map((p) => relative(root, realPath(p))));
/** The clones the writes add: each write's windows on its changed lines, against every other file (the index, minus the
 *  written files and `ignore`; each other write of the call as it will be; the write itself elsewhere in its own text). */
export function clonesIn(index, writes, { ignore = [] } = {}) {
    const p = prepare(writes);
    if (p.wanted.size === 0)
        return [];
    const skip = skipOf(index.root, writes, ignore);
    const others = Object.entries(index.files).filter(([rel]) => !skip.has(rel)).map(([rel, f]) => ({ file: join(index.root, rel), hits: windowHits(f.h, f.l, p.wanted) }));
    return match(p, others);
}
/** The same clones, the other files' windows asked of the resident runner's main thread (it holds the index; a worker holds none). */
export async function clonesAsked(root, writes, ask, { ignore = [] } = {}) {
    const p = prepare(writes);
    if (p.wanted.size === 0)
        return [];
    const real = realPath(root);
    const skip = skipOf(real, writes, ignore);
    const others = (await ask([...p.wanted].map(dupKey))).flatMap((f) => (f.windows && !skip.has(f.file) ? [{ file: join(real, f.file), hits: f.windows }] : []));
    return match(p, others);
}
// using lines, includes, imports and one-line constants name things: two files that open alike hold no logic to extract, and writing the names out is worse (KF-32).
const DECLARATION = /^\s*(?:$|using\b|#\s*include\b|import\b|from\s+\S+\s+import\b|namespace\b|[{}]\s*$|(?:static\s+|inline\s+)*(?:constexpr|const)\b[^(){}]*=[^(){}]*;\s*$)/;
const MIN_LOGIC_LINES = 3;
const holdsLogic = (text, { start, end }) => text.split('\n').slice(start - 1, end).filter((l) => !DECLARATION.test(l)).length >= MIN_LOGIC_LINES;
/** jscpd confirms the candidates, on the files they name alone, with the writes put beside them as they will be. */
function confirm(root, writes, maybe, { env, layout = {}, shape = null, ignore = [] }) {
    if (!maybe.length)
        return { clones: [] };
    const tmp = scratchDir('once-only-new-');
    try {
        const extra = writes.map((w, i) => {
            const path = join(tmp, String(i), basename(w.path));
            mkdirSync(join(tmp, String(i)), { recursive: true });
            writeFileSync(path, w.after);
            return { path, as: w.path };
        });
        const written = new Set(writes.map((w) => realPath(w.path)));
        const paths = [...new Set(maybe.map((c) => c.other.file))].filter((f) => !written.has(realPath(f)));
        const r = scan(root, { env, extra, ignore, layout, shape, paths });
        if (r.error)
            return { clones: [], error: r.error };
        const ranged = (w) => [...(w.ranges ?? (w.range ? [w.range] : []))];
        return { clones: writes.flatMap((w) => ranged(w).flatMap((range) => clonesOf(r.clones, w.path, range)).filter((c) => holdsLogic(w.after, c.at))) };
    }
    finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}
/** The clones the writes would add, as jscpd over the repo would find them: the index picks the candidates, jscpd confirms. */
export function judgeCopyWrites(root, writes, options) {
    const { layout = {}, shape = null, ignore = [], persist = true } = options;
    const index = loadIndex(root, { layout, shape, persist });
    return { ...confirm(root, writes, clonesIn(index, writes, { ignore }), options), index };
}
/** The same judgement with the candidates asked of the main thread: no index is read, kept or written here. */
export async function judgeCopyWritesAsked(root, writes, ask, options) {
    return confirm(root, writes, await clonesAsked(root, writes, ask, { ignore: options.ignore ?? [] }), options);
}
