// resident/dup-windows: the duplicate index (lib/dup-index.mts), kept on the daemon's main thread and asked by window hash (KWB-201). once-only's
// judge in a worker read the whole index file, or kept a copy of it in each worker (10 to 40 MB a worker); now the one copy is here, and a worker
// names the window hashes of what it writes and gets back the windows other files hold with those hashes. The index is brought up to date, from
// the files' mtimes, when asked after a tool call that may have written (stale), and an inverted map hash -> windows is changed for the files
// that moved only. A hash held in more than COMMON places is boilerplate to the judge: the first COMMON + 1 windows of it are answered, enough to say so.
import { COMMON, dupKey } from '../lib/dup-match.mts';
import type { Hit } from '../lib/dup-match.mts';
import { loadIndex } from '../lib/dup-index.mts';
import type { IndexedFile } from '../lib/dup-index.mts';
import { WINDOW } from '../lib/dup-tokens.mts';
import type { FileStatements } from '../lib/near-copies.mts';
import { readShape } from '../lib/shape.mts';
import type { Layout } from '../lib/types.d.mts';

type Held = readonly [file: string, at: number, line: number, end: number];

export interface DupWindows {
  /** For `dup:<hash>` keys: the files holding those windows, with the windows. Other keys are ignored. */
  find: (keys: readonly string[]) => FileStatements[];
  /** A tool call may have written: the next query reads the files' mtimes again. */
  stale: () => void;
}

const PREFIX = dupKey(0).slice(0, -1);

export function dupWindows(root: string, layout: () => Layout): DupWindows {
  const by = new Map<number, Held[]>();
  let files = new Map<string, IndexedFile>();
  let dirty = true;

  const drop = (rel: string, f: IndexedFile): void => {
    for (const hash of new Set(f.h)) {
      const left = (by.get(hash) ?? []).filter(([file]) => file !== rel);
      if (left.length) by.set(hash, left); else by.delete(hash);
    }
  };
  const add = (rel: string, f: IndexedFile): void => {
    f.h.forEach((hash, j) => {
      const list = by.get(hash);
      const held: Held = [rel, j, f.l[j] ?? 0, f.l[j + WINDOW - 1] ?? 0];
      if (!list) by.set(hash, [held]); else list.push(held);
    });
  };
  const refresh = (): void => {
    if (!dirty) return;
    dirty = false;
    const now = new Map(Object.entries(loadIndex(root, { layout: layout(), shape: readShape(root), persist: false, keep: true }).files));
    for (const [rel, f] of files) if (now.get(rel) !== f) drop(rel, f);
    for (const [rel, f] of now) if (files.get(rel) !== f) add(rel, f);
    files = now;
  };

  return {
    find: (keys) => {
      refresh();
      const found = new Map<string, Hit[]>();
      for (const key of keys) {
        if (!key.startsWith(PREFIX)) continue;
        const hash = Number(key.slice(PREFIX.length));
        for (const [file, at, line, end] of (by.get(hash) ?? []).slice(0, COMMON + 1)) {
          const list = found.get(file);
          const hit: Hit = [hash, at, line, end];
          if (list) list.push(hit); else found.set(file, [hit]);
        }
      }
      return [...found].map(([file, windows]) => ({ file, st: [], windows }));
    },
    stale: () => { dirty = true; },
  };
}
