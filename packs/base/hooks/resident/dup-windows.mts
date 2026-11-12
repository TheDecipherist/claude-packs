// resident/dup-windows: the duplicate index (lib/dup-index.mts), kept on the daemon's main thread and asked by window hash (KWB-201). once-only's
// judge in a worker read the whole index file, or kept a copy of it in each worker (10 to 40 MB a worker); now the one copy is here, and a worker
// names the window hashes of what it writes and gets back the windows other files hold with those hashes. The index is brought up to date, from
// the files' mtimes, when asked after a tool call that may have written (stale), and an inverted map hash -> windows is changed for the files
// that moved only. A hash held in more than COMMON places is boilerplate to the judge: the first COMMON + 1 windows of it are answered, enough to say so.
// A window is one number, file * 2^24 + the token it starts at, and a hash held once is that number alone: the map has half a million of them
// in a large checkout, and an array of four numbers each was 50 MB.
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

export function dupWindows(root: string, layout: () => Layout): DupWindows {
  const by = new Map<number, number | number[]>();
  const ids = new Map<string, number>();
  const names: string[] = [];
  const held: IndexedFile[] = [];   // by id
  let files = new Map<string, IndexedFile>();
  let dirty = true;

  const drop = (id: number, f: IndexedFile): void => {
    for (const hash of new Set(f.h)) {
      const at = by.get(hash);
      const left = Array.isArray(at) ? at.filter((w) => Math.floor(w / TOKENS) !== id) : (at !== undefined && Math.floor(at / TOKENS) === id ? [] : at);
      if (left === undefined || (Array.isArray(left) && left.length === 0)) by.delete(hash);
      else by.set(hash, Array.isArray(left) && left.length === 1 ? (left[0] ?? 0) : left);
    }
  };
  const add = (id: number, f: IndexedFile): void => {
    held[id] = f;
    f.h.forEach((hash, j) => {
      const w = id * TOKENS + j;
      const at = by.get(hash);
      if (at === undefined) by.set(hash, w); else if (Array.isArray(at)) at.push(w); else by.set(hash, [at, w]);
    });
  };
  const idOf = (rel: string): number => {
    const known = ids.get(rel);
    if (known !== undefined) return known;
    ids.set(rel, names.length);
    names.push(rel);
    return names.length - 1;
  };
  const refresh = (): void => {
    if (!dirty) return;
    dirty = false;
    const now = new Map(Object.entries(loadIndex(root, { layout: layout(), shape: readShape(root), persist: false, keep: true }).files));
    for (const [rel, f] of files) if (now.get(rel) !== f) drop(idOf(rel), f);
    for (const [rel, f] of now) if (files.get(rel) !== f) add(idOf(rel), f);
    files = now;
  };

  return {
    find: (keys) => {
      refresh();
      const found = new Map<string, Hit[]>();
      for (const key of keys) {
        if (!key.startsWith(PREFIX)) continue;
        const hash = Number(key.slice(PREFIX.length));
        const at = by.get(hash);
        for (const w of (Array.isArray(at) ? at : at === undefined ? [] : [at]).slice(0, COMMON + 1)) {
          const id = Math.floor(w / TOKENS);
          const j = w - id * TOKENS;
          const l = held[id]?.l ?? [];
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
