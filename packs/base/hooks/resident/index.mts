// resident/index: the repetition indexes, kept on the daemon's main thread (review-2-go 2.5). A worker never holds one and never gets
// one: it asks by message which files hold any of the keys it names (a statement's hash, an element shape's `shape:<id>`, a definition's
// `def:<name>`; and `dup:<window hash>` of the duplicate index, resident/dup-windows.mts), and the answer is those files' entries only. The index is built when first asked and rebuilt, from the files' mtimes,
// after a tool call that may have written (a PostToolUse event marks it stale), so a write and a second write repeating it, served by
// another worker, see the first. A key is looked up in a map built with the index, not found by a walk of every file per question (KWB-201).
import { Worker } from 'node:worker_threads';
import { dupWindows } from './dup-windows.mts';
import { defKey, repoIndex, shapeKey, type RepoIndex } from '../lib/repo-index.mts';
import type { FileStatements } from '../lib/near-copies.mts';
import type { WarmData } from './warm.mts';
import type { Layout } from '../lib/types.d.mts';

export interface ResidentIndex {
  /** The files that hold any of the keys (statement hashes, `shape:` ids, `def:` names), with their statements, shapes and definitions. */
  candidates: (keys: readonly string[]) => FileStatements[];
  /** The warm-up still running (a query waits for it), or null. */
  warming: () => Promise<void> | null;
  /** A tool call may have written: the next query reads the files' mtimes again. */
  stale: () => void;
  /** Builds both indexes in a worker thread of their own (`warmUrl`), so the first query reads them kept; the pool holds an ask meanwhile (`warming`), the main thread never blocked. */
  warm: (warmUrl: URL) => void;
  /** Ends the warm-up worker, if it still runs. */
  close: () => void;
  /** Files indexed now (0 before the first query). */
  size: () => number;
}

const WRITES = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash']);
/** Whether a PostToolUse event of this tool may have changed files. */
export const mayHaveWritten = (tool: string | undefined): boolean => tool !== undefined && WRITES.has(tool);

/** key -> the files that hold it. */
function keysOf(index: RepoIndex): Map<string, string[]> {
  const by = new Map<string, string[]>();
  for (const [file, entry] of Object.entries(index)) {
    const mine = new Set<string>([...entry.st.map(([h]) => h), ...entry.shapes.map(([id]) => shapeKey(id)), ...entry.defs.map(([name]) => defKey(name))]);
    for (const key of mine) { const files = by.get(key); if (files) files.push(file); else by.set(key, [file]); }
  }
  return by;
}

export function residentIndex(root: string, layout: () => Layout): ResidentIndex {
  let warming: Promise<void> | null = null;
  let builder: Worker | null = null;
  let built: { index: RepoIndex; keys: Map<string, string[]> } | null = null;
  let dirty = true;
  const fresh = (): { index: RepoIndex; keys: Map<string, string[]> } => {
    if (built === null || dirty) {
      const index = repoIndex(root, [], layout());
      built = { index, keys: keysOf(index) };
      dirty = false;
    }
    return built;
  };
  const dup = dupWindows(root, layout);
  const repoOf = (wanted: readonly string[]): FileStatements[] => {
    const { index, keys } = fresh();
    const files = new Set(wanted.flatMap((k) => keys.get(k) ?? []));
    return [...files].flatMap((file) => { const e = index[file]; return e ? [{ file, st: e.st, shapes: e.shapes, defs: e.defs }] : []; });
  };
  return {
    // a question names either kind of key; the index it does not ask is not built for it
    candidates: (wanted) => [...(wanted.some((k) => !k.startsWith('dup:')) ? repoOf(wanted) : []), ...dup.find(wanted)],
    warming: () => warming,
    warm: (warmUrl) => {
      const data: WarmData = { root, layout: layout() };
      warming = new Promise<void>((done) => {
        const w = new Worker(warmUrl, { workerData: data, execArgv: [] }); // none of the parent's (a test's --import gives a worker a temp folder of its own)
        builder = w;
        const over = (): void => { builder = null; warming = null; done(); };   // built, or failed: the main thread builds what is missing itself
        w.once('message', () => void w.terminate());
        w.once('error', over);
        w.once('exit', over);
      });
    },
    close: () => { void builder?.terminate(); },
    stale: () => { dirty = true; dup.stale(); },
    size: () => (built === null ? 0 : Object.keys(built.index).length),
  };
}
