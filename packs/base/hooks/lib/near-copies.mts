// What a write repeats when no stretch of it is an exact copy (0.25.0). AI rarely copies exactly: it writes the same thing again with a line
// changed here and there, or makes a function the repo already has. Both are judged from each file's statements and definitions:
//   fingerprint(text, ext) -> [[hash, line]]    the statements long enough to mean something
//   definesOf(text, ext)   -> [[name, line]]    the functions and classes defined at the top level
//   nearCopy(added, others) -> { file, from, to, line, matched, of } | null: the place holding most of `added`, in order
import { statementsOf } from './code-shapes.mts';
import { shortHash } from './hash.mts';
import { languageOf } from './languages.mts';

const MIN_STATEMENT = 8;   // tokens: a shorter statement has one shape in any file
const MIN_MATCHED = 8;     // statements in order, in one place
const MIN_SHARE = 0.7;     // of the statements in that stretch of the write
const COMMON = 0.04;       // of the files: a statement this common says nothing
const CANDIDATES = 3;

/** A statement's shape hash and its line. */
export type Fingerprint = readonly [hash: string, line: number];
/** A file and the statements it holds. The daemon's index answers with what else it keeps of the file too (its element shapes, as [id, line, what],
 *  and its definitions, as [name, line]) so a judge needs no index of its own (template-law, KWB-201). */
export interface FileStatements {
  file: string;
  st: readonly Fingerprint[];
  shapes?: ReadonlyArray<readonly [id: string, line: number, what: string]>;
  defs?: ReadonlyArray<readonly [name: string, line: number]>;
}
/** The place in another file that holds most of what was added. */
export interface NearCopy { file: string; from: number; to: number; line: number; matched: number; of: number }

interface Stretch { s: number; e: number; n: number; spanA: number }

export function fingerprint(text: string, ext: string): Fingerprint[] {
  const lang = languageOf(ext);
  if (!lang) return [];
  return statementsOf(text, lang).filter((s) => s.tokens.length >= MIN_STATEMENT).map((s): Fingerprint => [shortHash(s.shape, 10), s.line]);
}

export function definesOf(text: string, ext: string): Array<[name: string, line: number]> {
  const lang = languageOf(ext);
  if (!lang?.define) return [];
  const code = (lang.ownDefinitions ?? ((c: string) => c))(lang.blank(text));
  const out: Array<[string, number]> = [];
  for (const m of code.matchAll(lang.define)) {
    const name = m.slice(1).find(Boolean);
    if (name) out.push([name, code.slice(0, m.index).split('\n').length]);
  }
  return out;
}

// The longest common subsequence of two lists of hashes, as pairs of indexes.
function matchedPairs(a: readonly string[], b: readonly string[]): Array<[number, number]> {
  const w = b.length + 1;
  const t = new Uint16Array((a.length + 1) * w);
  const at = (i: number, j: number): number => t[i * w + j] ?? 0;
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) t[i * w + j] = a[i] === b[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
  }
  const out: Array<[number, number]> = [];
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { out.push([i, j]); i += 1; j += 1; } else if (at(i + 1, j) >= at(i, j + 1)) i += 1; else j += 1;
  }
  return out;
}

// The densest stretch of pairs: most of the statements on both sides are matched.
function densest(pairs: ReadonlyArray<readonly [number, number]>): Stretch | null {
  let best: Stretch | null = null;
  for (let s = 0; s < pairs.length; s += 1) {
    for (let e = pairs.length - 1; e >= s + MIN_MATCHED - 1; e -= 1) {
      const first = pairs[s];
      const last = pairs[e];
      if (!first || !last) continue;
      const n = e - s + 1;
      const spanA = last[0] - first[0] + 1;
      const spanB = last[1] - first[1] + 1;
      if (n / spanA >= MIN_SHARE && n / spanB >= MIN_SHARE) { if (!best || n > best.n) best = { s, e, n, spanA }; break; }
    }
  }
  return best;
}

// others: [{ file, st: [[hash, line]] }]. `added`: the statements this write adds, in order.
export function nearCopy(added: readonly Fingerprint[], others: readonly FileStatements[]): NearCopy | null {
  if (added.length < MIN_MATCHED) return null;
  const seen = new Map<string, number>();
  for (const o of others) for (const h of new Set(o.st.map(([x]) => x))) seen.set(h, (seen.get(h) ?? 0) + 1);
  const limit = Math.max(4, others.length * COMMON);
  const rare = (list: readonly Fingerprint[]): Fingerprint[] => list.filter(([h]) => (seen.get(h) ?? 0) <= limit);
  const mine = rare(added);
  const wanted = new Set(mine.map(([h]) => h));
  const ranked = others.map((o) => ({ o, hits: new Set(o.st.map(([h]) => h).filter((h) => wanted.has(h))).size })).filter((c) => c.hits >= MIN_MATCHED).sort((a, b) => b.hits - a.hits).slice(0, CANDIDATES);
  for (const { o } of ranked) {
    const theirs = rare(o.st);
    const pairs = matchedPairs(mine.map(([h]) => h), theirs.map(([h]) => h));
    const d = densest(pairs);
    const first = d && pairs[d.s];
    const last = d && pairs[d.e];
    if (d && first && last) {
      const from = theirs[first[1]];
      const to = theirs[last[1]];
      const line = mine[first[0]];
      if (from && to && line) return { file: o.file, from: from[1], to: to[1], line: line[1], matched: d.n, of: d.spanA };
    }
  }
  return null;
}
