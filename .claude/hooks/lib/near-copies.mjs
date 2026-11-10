// What a write repeats when no stretch of it is an exact copy (0.25.0). AI rarely copies exactly: it writes the same thing again with a line
// changed here and there, or makes a function the repo already has. Both are judged from each file's statements and definitions:
//   fingerprint(text, ext) -> [[hash, line]]    the statements long enough to mean something
//   definesOf(text, ext)   -> [[name, line]]    the functions and classes defined at the top level
//   nearCopy(added, others) -> { file, from, to, line, matched, of } | null: the place holding most of `added`, in order
import { createHash } from 'node:crypto';
import { statementsOf } from './code-shapes.mjs';
import { languageOf } from './languages.mjs';

const MIN_STATEMENT = 8;   // tokens: a shorter statement has one shape in any file
const MIN_MATCHED = 8;     // statements in order, in one place
const MIN_SHARE = 0.7;     // of the statements in that stretch of the write
const COMMON = 0.04;       // of the files: a statement this common says nothing
const CANDIDATES = 3;

const hashOf = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

export function fingerprint(text, ext) {
  const lang = languageOf(ext);
  if (!lang) return [];
  return statementsOf(text, lang).filter((s) => s.tokens.length >= MIN_STATEMENT).map((s) => [hashOf(s.shape), s.line]);
}

export function definesOf(text, ext) {
  const lang = languageOf(ext);
  if (!lang?.define) return [];
  const code = (lang.ownDefinitions ?? ((c) => c))(lang.blank(text));
  return [...code.matchAll(lang.define)].map((m) => [m.slice(1).find(Boolean), code.slice(0, m.index).split('\n').length]).filter(([name]) => name);
}

// The longest common subsequence of two lists of hashes, as pairs of indexes.
function matchedPairs(a, b) {
  const w = b.length + 1;
  const t = new Uint16Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) t[i * w + j] = a[i] === b[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
  }
  const out = [];
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { out.push([i, j]); i += 1; j += 1; } else if (t[(i + 1) * w + j] >= t[i * w + j + 1]) i += 1; else j += 1;
  }
  return out;
}

// The densest stretch of pairs: most of the statements on both sides are matched.
function densest(pairs) {
  let best = null;
  for (let s = 0; s < pairs.length; s += 1) {
    for (let e = pairs.length - 1; e >= s + MIN_MATCHED - 1; e -= 1) {
      const n = e - s + 1;
      const spanA = pairs[e][0] - pairs[s][0] + 1;
      const spanB = pairs[e][1] - pairs[s][1] + 1;
      if (n / spanA >= MIN_SHARE && n / spanB >= MIN_SHARE) { if (!best || n > best.n) best = { s, e, n, spanA }; break; }
    }
  }
  return best;
}

// others: [{ file, st: [[hash, line]] }]. `added`: the statements this write adds, in order.
export function nearCopy(added, others) {
  if (added.length < MIN_MATCHED) return null;
  const seen = new Map();
  for (const o of others) for (const h of new Set(o.st.map(([x]) => x))) seen.set(h, (seen.get(h) ?? 0) + 1);
  const limit = Math.max(4, others.length * COMMON);
  const rare = (list) => list.filter(([h]) => (seen.get(h) ?? 0) <= limit);
  const mine = rare(added);
  const wanted = new Set(mine.map(([h]) => h));
  const ranked = others.map((o) => ({ o, hits: new Set(o.st.map(([h]) => h).filter((h) => wanted.has(h))).size })).filter((c) => c.hits >= MIN_MATCHED).sort((a, b) => b.hits - a.hits).slice(0, CANDIDATES);
  for (const { o } of ranked) {
    const theirs = rare(o.st);
    const pairs = matchedPairs(mine.map(([h]) => h), theirs.map(([h]) => h));
    const d = densest(pairs);
    if (d) return { file: o.file, from: theirs[pairs[d.s][1]][1], to: theirs[pairs[d.e][1]][1], line: mine[pairs[d.s][0]][1], matched: d.n, of: d.spanA };
  }
  return null;
}
