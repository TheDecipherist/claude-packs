// program-named: when a program writes a path the reader cannot work out, every path-like literal it names (less the ones it only
// reads) is a write of unknown content, so the path-based hooks still judge it (program-writes.mts).
import type { ProgramWrite } from './program-writes.mts';

const PATH_LIKE = /^[~\w.@+\-/]+$/;
const NOT_A_PATH = /^[-.]+$|^-|^\d+(\.\d+)*$/;
const HAS_EXTENSION = /\.[A-Za-z][A-Za-z0-9]{0,7}$/;
const MAX_LITERAL = 300;

/** The writes of unknown content for each path-like literal not already written or read, added to `out`. */
export function addNamedWrites(
  out: ProgramWrite[],
  lits: ReadonlyArray<string | null>,
  at: (path: string) => string,
  reads: ReadonlySet<string>,
): void {
  const named = new Set(out.map((w) => w.path));
  for (const l of lits) {
    if (l === null || l.length > MAX_LITERAL || !PATH_LIKE.test(l) || NOT_A_PATH.test(l) || !(l.includes('/') || HAS_EXTENSION.test(l))) continue;
    const p = at(l);
    if (!named.has(p) && !reads.has(p)) { named.add(p); out.push({ path: p, op: 'write', content: null, named: true }); }
  }
}
