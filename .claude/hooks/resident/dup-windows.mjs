// resident/dup-windows: the duplicate index (lib/dup-index.mts), kept on the daemon's main thread and asked by window hash (KWB-201). once-only's
// judge in a worker read the whole index file, or kept a copy of it in each worker (10 to 40 MB a worker); now the one copy is here, and a worker
// names the window hashes of what it writes and gets back the windows other files hold with those hashes. A hash held in more than COMMON places
// is boilerplate to the judge: the first COMMON + 1 windows of it are answered, enough to say so.
// A window is one number, file * 2^24 + the token it starts at. The windows live in typed arrays, bucketed by hash (rss: a Map of half a
// million windows held 55 MB of the main thread's heap; these hold about 13 bytes a window): `keys` and `wins` sorted by bucket, `starts`
// where each bucket begins. A file that changes after they are built is marked dead in them and its windows go to a small map beside them;
// they are built again when that map, or the dead, grow past an eighth of them. The index is brought up to date, from the files' mtimes,
// when asked after a tool call that may have written (stale).
import { COMMON, dupKey } from '../lib/dup-match.mjs';
import { loadIndex } from '../lib/dup-index.mjs';
import { WINDOW } from '../lib/dup-tokens.mjs';
import { readShape } from '../lib/shape.mjs';
const PREFIX = dupKey(0).slice(0, -1);
const TOKENS = 2 ** 24; // a source file is at most 512 KB: fewer tokens than this
const BUCKET_BITS = 18;
const BUCKETS = 2 ** BUCKET_BITS;
const MASK = BUCKETS - 1;
/** The side map and the dead files are folded into the arrays when either passes this share of them. */
const REBUILD_SHARE = 8;
/** The windows of these files, bucketed by hash: two passes, a count and a fill, so each bucket keeps file and token order. */
function tableOf(held) {
    const starts = new Uint32Array(BUCKETS + 1);
    for (const f of held.values())
        for (const hash of f.h)
            starts[(hash & MASK) + 1] = (starts[(hash & MASK) + 1] ?? 0) + 1;
    for (let b = 0; b < BUCKETS; b += 1)
        starts[b + 1] = (starts[b + 1] ?? 0) + (starts[b] ?? 0);
    const n = starts[BUCKETS] ?? 0;
    const keys = new Uint32Array(n);
    const wins = new Float64Array(n);
    const next = starts.slice(0, BUCKETS);
    for (const [id, f] of held) {
        f.h.forEach((hash, j) => {
            const b = hash & MASK;
            const at = next[b] ?? 0;
            keys[at] = hash;
            wins[at] = id * TOKENS + j;
            next[b] = at + 1;
        });
    }
    return { keys, wins, starts, dead: new Set(), files: held.size };
}
/** The windows of a hash: the table's, its dead files left out, then the side map's. */
function windowsOf(t, side, hash) {
    const out = [];
    const b = hash & MASK;
    for (let i = t.starts[b] ?? 0, end = t.starts[b + 1] ?? 0; i < end; i += 1) {
        const w = t.wins[i] ?? 0;
        if (t.keys[i] === hash && !t.dead.has(Math.floor(w / TOKENS)))
            out.push(w);
    }
    return [...out, ...(side.get(hash) ?? [])];
}
export function dupWindows(root, layout) {
    const ids = new Map();
    const names = [];
    const held = new Map(); // by id: the files as they are now
    const side = new Map(); // hash -> windows of the files changed since the table was built
    const sideFiles = new Set();
    let sideCount = 0;
    let table = null;
    let files = new Map();
    let dirty = true;
    const idOf = (rel) => {
        const known = ids.get(rel);
        if (known !== undefined)
            return known;
        ids.set(rel, names.length);
        names.push(rel);
        return names.length - 1;
    };
    const dropSide = (id, f) => {
        for (const hash of new Set(f.h)) {
            const left = (side.get(hash) ?? []).filter((w) => Math.floor(w / TOKENS) !== id);
            sideCount -= (side.get(hash)?.length ?? 0) - left.length;
            if (left.length === 0)
                side.delete(hash);
            else
                side.set(hash, left);
        }
    };
    const addSide = (id, f) => {
        sideFiles.add(id);
        sideCount += f.h.length;
        f.h.forEach((hash, j) => { const list = side.get(hash); if (list)
            list.push(id * TOKENS + j);
        else
            side.set(hash, [id * TOKENS + j]); });
    };
    /** A file is gone or changed: its windows leave the side map, or the table marks it dead. */
    const forget = (id, f) => {
        if (sideFiles.has(id))
            dropSide(id, f);
        else
            table?.dead.add(id);
    };
    const rebuild = () => {
        table = tableOf(held);
        side.clear();
        sideFiles.clear();
        sideCount = 0;
    };
    const refresh = () => {
        if (!dirty)
            return;
        dirty = false;
        const now = new Map(Object.entries(loadIndex(root, { layout: layout(), shape: readShape(root), persist: false, keep: true }).files));
        for (const [rel, f] of files)
            if (now.get(rel) !== f) {
                forget(idOf(rel), f);
                held.delete(idOf(rel));
            }
        for (const [rel, f] of now)
            if (files.get(rel) !== f) {
                held.set(idOf(rel), f);
                if (table !== null)
                    addSide(idOf(rel), f);
            }
        files = now;
        const t = table;
        if (t === null || sideCount * REBUILD_SHARE > t.keys.length || t.dead.size * REBUILD_SHARE > t.files)
            rebuild();
    };
    return {
        find: (keys) => {
            refresh();
            const found = new Map();
            for (const key of keys) {
                if (!key.startsWith(PREFIX) || table === null)
                    continue;
                const hash = Number(key.slice(PREFIX.length));
                for (const w of windowsOf(table, side, hash).slice(0, COMMON + 1)) {
                    const id = Math.floor(w / TOKENS);
                    const j = w - id * TOKENS;
                    const l = held.get(id)?.l ?? [];
                    const rel = names[id] ?? '';
                    const hit = [hash, j, l[j] ?? 0, l[j + WINDOW - 1] ?? 0];
                    const list = found.get(rel);
                    if (list)
                        list.push(hit);
                    else
                        found.set(rel, [hit]);
                }
            }
            return [...found].map(([file, windows]) => ({ file, st: [], windows }));
        },
        stale: () => { dirty = true; },
    };
}
