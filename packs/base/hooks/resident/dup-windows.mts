// resident/dup-windows: the duplicate index (lib/dup-index.mts), kept on the daemon's main thread and asked by window hash (KWB-201). once-only's
// judge in a worker read the whole index file, or kept a copy of it in each worker (10 to 40 MB a worker); now the one copy is here, and a worker
// names the window hashes of what it writes and gets back the windows other files hold with those hashes. A hash held in more than COMMON places
// is boilerplate to the judge: the first COMMON + 1 windows of it are answered, enough to say so.
// A window is one number, file * 2^24 + the token it starts at. The windows live in typed arrays, bucketed by hash (rss: a Map of half a
// million windows held 55 MB of the main thread's heap; these hold about 13 bytes a window): `keys` and `wins` sorted by bucket, `starts`
// where each bucket begins. A file that changes after they are built is marked dead in them and its windows go to a small map beside them;
// they are built again when that map, or the dead, grow past an eighth of them. The index is brought up to date, from the files' mtimes,
// when asked after a tool call that may have written (stale).
import { COMMON, dupKey } from '../lib/dup-match.mts';
import type { Hit } from '../lib/dup-match.mts';
import { loadIndex } from '../lib/dup-index.mts';
import type { IndexedFile } from '../lib/dup-index.mts';
import { WINDOW } from '../lib/dup-tokens.mts';
import type { FileStatements } from '../lib/near-copies.mts';
import { readShape } from '../lib/shape.mts';
import type { Layout } from '../lib/types.d.mts';

export interface DupWindows {
  /** For `dup:<hash>` keys: the files holding those windows, with the windows. Other keys are ignored. */
  find: (keys: readonly string[]) => FileStatements[];
  /** A tool call may have written: the next query reads the files' mtimes again. */
  stale: () => void;
}

const PREFIX = dupKey(0).slice(0, -1);
const TOKENS = 2 ** 24;   // a source file is at most 512 KB: fewer tokens than this
const BUCKET_BITS = 18;
const BUCKETS = 2 ** BUCKET_BITS;
const MASK = BUCKETS - 1;
/** The side map and the dead files are folded into the arrays when either passes this share of them. */
const REBUILD_SHARE = 8;

interface Table { keys: Uint32Array; wins: Float64Array; starts: Uint32Array; dead: Set<number>; files: number }

/** The windows of these files, bucketed by hash: two passes, a count and a fill, so each bucket keeps file and token order. */
function tableOf(held: ReadonlyMap<number, IndexedFile>): Table {
  const starts = new Uint32Array(BUCKETS + 1);
  for (const f of held.values()) for (const hash of f.h) starts[(hash & MASK) + 1] = (starts[(hash & MASK) + 1] ?? 0) + 1;
  for (let b = 0; b < BUCKETS; b += 1) starts[b + 1] = (starts[b + 1] ?? 0) + (starts[b] ?? 0);
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
function windowsOf(t: Table, side: ReadonlyMap<number, number[]>, hash: number): number[] {
  const out: number[] = [];
  const b = hash & MASK;
  for (let i = t.starts[b] ?? 0, end = t.starts[b + 1] ?? 0; i < end; i += 1) {
    const w = t.wins[i] ?? 0;
    if (t.keys[i] === hash && !t.dead.has(Math.floor(w / TOKENS))) out.push(w);
  }
  return [...out, ...(side.get(hash) ?? [])];
}

export function dupWindows(root: string, layout: () => Layout): DupWindows {
  const ids = new Map<string, number>();
  const names: string[] = [];
  const held = new Map<number, IndexedFile>();   // by id: the files as they are now
  const side = new Map<number, number[]>();      // hash -> windows of the files changed since the table was built
  const sideFiles = new Set<number>();
  let sideCount = 0;
  let table: Table | null = null;
  let files = new Map<string, IndexedFile>();
  let dirty = true;

  const idOf = (rel: string): number => {
    const known = ids.get(rel);
    if (known !== undefined) return known;
    ids.set(rel, names.length);
    names.push(rel);
    return names.length - 1;
  };
  const dropSide = (id: number, f: IndexedFile): void => {
    for (const hash of new Set(f.h)) {
      const left = (side.get(hash) ?? []).filter((w) => Math.floor(w / TOKENS) !== id);
      sideCount -= (side.get(hash)?.length ?? 0) - left.length;
      if (left.length === 0) side.delete(hash); else side.set(hash, left);
    }
  };
  const addSide = (id: number, f: IndexedFile): void => {
    sideFiles.add(id);
    sideCount += f.h.length;
    f.h.forEach((hash, j) => { const list = side.get(hash); if (list) list.push(id * TOKENS + j); else side.set(hash, [id * TOKENS + j]); });
  };
  /** A file is gone or changed: its windows leave the side map, or the table marks it dead. */
  const forget = (id: number, f: IndexedFile): void => {
    if (sideFiles.has(id)) dropSide(id, f);
    else table?.dead.add(id);
  };
  const rebuild = (): void => {
    table = tableOf(held);
    side.clear();
    sideFiles.clear();
    sideCount = 0;
  };
  const refresh = (): void => {
    if (!dirty) return;
    dirty = false;
    const now = new Map(Object.entries(loadIndex(root, { layout: layout(), shape: readShape(root), persist: false, keep: true }).files));
    for (const [rel, f] of files) if (now.get(rel) !== f) { forget(idOf(rel), f); held.delete(idOf(rel)); }
    for (const [rel, f] of now) if (files.get(rel) !== f) { held.set(idOf(rel), f); if (table !== null) addSide(idOf(rel), f); }
    files = now;
    const t: Table | null = table;
    if (t === null || sideCount * REBUILD_SHARE > t.keys.length || t.dead.size * REBUILD_SHARE > t.files) rebuild();
  };

  return {
    find: (keys) => {
      refresh();
      const found = new Map<string, Hit[]>();
      for (const key of keys) {
        if (!key.startsWith(PREFIX) || table === null) continue;
        const hash = Number(key.slice(PREFIX.length));
        for (const w of windowsOf(table, side, hash).slice(0, COMMON + 1)) {
          const id = Math.floor(w / TOKENS);
          const j = w - id * TOKENS;
          const l = held.get(id)?.l ?? [];
          const rel = names[id] ?? '';
          const hit: Hit = [hash, j, l[j] ?? 0, l[j + WINDOW - 1] ?? 0];
          const list = found.get(rel);
          if (list) list.push(hit); else found.set(rel, [hit]);
        }
      }
      return [...found].map(([file, windows]) => ({ file, st: [], windows }));
    },
    stale: () => { dirty = true; },
  };
}
