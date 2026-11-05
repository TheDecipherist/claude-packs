// dup-index: once-only's detector at write time (KWB-24). jscpd read the whole repo on every source write; this keeps an
// index instead, built once and updated for the files that changed since, so a write costs one walk of the folders (a stat
// of each source file, no reading) and a lookup, never a rescan.
//   The index: per source file (lib/dup.mjs: SOURCE, its excludes, the same files jscpd judged), the hash of every window of
//   WINDOW tokens (comments and blank space left out, as jscpd's mild mode) and the line each token is on; kept in
//   $TMPDIR/claude-packs-dup-index/<checkout>.json, keyed by modification time and size. A file that changed is read again;
//   one that is gone leaves.
//   A candidate clone: the windows of the new text that are also in one other file, chained in order along one diagonal (a
//   line changed inside a copy moves it by a few tokens; a gap of up to LIMITS.gap lines), covering LOOSE.tokens tokens over
//   LOOSE.lines lines on either side, a little under jscpd's LIMITS (lib/dup.mjs) so the candidates hold every clone jscpd
//   finds (measured on a C++ project's 752 sources: all 55 files jscpd flags are among them). A window found in more than COMMON
//   places is boilerplate and never starts a match.
//   loadIndex(root, { layout, shape }) -> { root, files: { rel: { h, l } }, built, read }   (read: files tokenized this call)
//   clonesIn(index, writes, { ignore }) -> [{ at, other, lines, tokens }]  writes: [{ path, after, range | ranges }] (the changed
//       lines, [lo, hi] each; one write per path), sides { file, start, end }
//   judgeWrites(root, writes, { layout, shape, ignore }) -> { clones, error, index }: the index finds the candidates (it is
//       looser than jscpd: a superset, measured on a C++ project's tree), then jscpd confirms on those files alone, so a write is
//       refused when jscpd over the repo would refuse it, and a write with no candidate never starts jscpd.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { clonesOf, excludeGlobs, LIMITS, real, scan, SOURCE } from './dup.mjs';
import { matchesAny } from './glob.mjs';

export const WINDOW = 20;
const COMMON = 40;
// A candidate is looser than jscpd's clone (it counts tokens and lines its own way: a block jscpd reads as 7 lines can be 5
// here), so nothing jscpd would refuse is missed; jscpd then judges the candidates (judgeWrites).
const LOOSE = { tokens: Math.round(LIMITS.tokens * 0.8), lines: LIMITS.lines - 2 };
const MAX_BYTES = 512 * 1024; // a table or a blob, not code anyone copies by hand
const VERSION = 1;

const C_LIKE = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|\d[\w.]*|\S/g;
const PY = /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|[A-Za-z_]\w*|\d[\w.]*|\S/g;

// -> { t: [token], l: [line of each token] }
export function tokenize(text, path) {
  const re = new RegExp((/\.py$/i.test(path) ? PY : C_LIKE).source, 'g');
  const t = [];
  const l = [];
  let line = 1;
  let at = 0;
  for (const m of text.matchAll(re)) {
    for (let i = at; i < m.index; i += 1) if (text.charCodeAt(i) === 10) line += 1;
    const s = m[0];
    const comment = s.startsWith('//') || s.startsWith('/*') || (s[0] === '#' && /\.py$/i.test(path));
    if (!comment) { t.push(s); l.push(line); }
    for (let i = 0; i < s.length; i += 1) if (s.charCodeAt(i) === 10) line += 1;
    at = m.index + s.length;
  }
  return { t, l };
}

// FNV-1a over a window's tokens, one number per window start.
export function windows(t) {
  const out = [];
  for (let i = 0; i + WINDOW <= t.length; i += 1) {
    let h = 0x811c9dc5;
    for (let k = i; k < i + WINDOW; k += 1) {
      const s = t[k];
      for (let c = 0; c < s.length; c += 1) { h ^= s.charCodeAt(c); h = Math.imul(h, 0x01000193); }
      h ^= 0x1f; h = Math.imul(h, 0x01000193);
    }
    out.push(h >>> 0);
  }
  return out;
}

const fileOf = (root) => join(process.env.TMPDIR ?? tmpdir(), 'claude-packs-dup-index', `${createHash('sha1').update(real(root)).digest('hex').slice(0, 16)}.json`);

// Every source file under root that the index judges: { rel: { m, s } }. Folders an exclude covers are never entered.
function walk(root, ex) {
  const out = {};
  const go = (dir, rel) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { if (!matchesAny(`${r}/x`, ex) && !matchesAny(`${r}/x/x`, ex)) go(join(dir, e.name), r); continue; }
      if (!e.isFile() || !SOURCE.test(e.name) || matchesAny(r, ex)) continue;
      try { const st = statSync(join(dir, e.name)); if (st.size <= MAX_BYTES) out[r] = { m: st.mtimeMs, s: st.size }; } catch { /* gone */ }
    }
  };
  go(root, '');
  return out;
}

export function loadIndex(root, { layout = {}, shape = null } = {}) {
  const file = fileOf(root);
  let old = null;
  try { old = JSON.parse(readFileSync(file, 'utf8')); } catch { /* built below */ }
  if (old?.v !== VERSION || old.root !== real(root)) old = null;
  const ex = excludeGlobs(layout, shape);
  const now = walk(root, ex);
  const files = {};
  let read = 0;
  for (const [rel, st] of Object.entries(now)) {
    const was = old?.files[rel];
    if (was && was.m === st.m && was.s === st.s) { files[rel] = was; continue; }
    let text = '';
    try { text = readFileSync(join(root, rel), 'utf8'); } catch { continue; }
    const { t, l } = tokenize(text, rel);
    files[rel] = { m: st.m, s: st.s, h: windows(t), l };
    read += 1;
  }
  const changed = read > 0 || !old || Object.keys(old.files).length !== Object.keys(files).length;
  if (changed) {
    try {
      mkdirSync(join(file, '..'), { recursive: true });
      const tmp = `${file}.${process.pid}`;
      writeFileSync(tmp, JSON.stringify({ v: VERSION, root: real(root), files }));
      renameSync(tmp, file);
    } catch { /* judged all the same */ }
  }
  return { root: real(root), files, built: !old, read };
}

// The clones the writes add: each write's windows on its changed lines, against every other file (the index, minus the
// written files and `ignore`; each other write of the call as it will be; the write itself elsewhere in its own text).
export function clonesIn(index, writes, { ignore = [] } = {}) {
  const skip = new Set([...ignore, ...writes.map((w) => w.path)].map((p) => relative(index.root, real(p))));
  const texts = writes.map((w) => { const { t, l } = tokenize(w.after, w.path); return { w, l, h: windows(t), n: t.length }; });
  const found = [];
  for (const q of texts) {
    const ranges = q.w.ranges ?? [q.w.range];
    const want = new Map();
    for (let i = 0; i < q.h.length; i += 1) {
      if (!ranges.some(([lo, hi]) => q.l[i] <= hi && q.l[i + WINDOW - 1] >= lo)) continue;
      if (!want.has(q.h[i])) want.set(q.h[i], []);
      want.get(q.h[i]).push(i);
    }
    if (!want.size) continue;
    const others = [];
    for (const [rel, f] of Object.entries(index.files)) if (!skip.has(rel)) others.push({ file: join(index.root, rel), h: f.h, l: f.l });
    for (const o of texts) others.push({ file: real(o.w.path), h: o.h, l: o.l, self: o === q });
    const pairs = new Map(); // other -> [[i, j]]
    const seen = new Map();
    for (const o of others) {
      for (let j = 0; j < o.h.length; j += 1) {
        const is = want.get(o.h[j]);
        if (!is) continue;
        seen.set(o.h[j], (seen.get(o.h[j]) ?? 0) + 1);
        for (const i of is) if (!o.self || Math.abs(i - j) >= WINDOW) { if (!pairs.has(o)) pairs.set(o, []); pairs.get(o).push([i, j]); }
      }
    }
    for (const [o, ps] of pairs) {
      const real_ = ps.filter(([i]) => (seen.get(q.h[i]) ?? 0) <= COMMON).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      for (const c of chains(real_, q.l)) {
        // either side's lines (jscpd counts a block written on 3 long lines that repeats one of 7 lines)
        const lines = Math.max(q.l[c.end - 1] - q.l[c.start] + 1, o.l[c.jhi - 1] - o.l[c.jlo] + 1);
        if (c.covered < LOOSE.tokens || lines < LOOSE.lines) continue;
        found.push({ at: { file: real(q.w.path), start: q.l[c.start], end: q.l[c.end - 1] }, other: { file: o.file, start: o.l[c.jlo], end: o.l[c.jhi - 1] }, lines, tokens: c.covered });
      }
    }
  }
  return found;
}

// Matched window pairs [i (new), j (other)], sorted by i, chained along a diagonal: a change of a few tokens inside a copy
// keeps it one chain; a gap of more than LIMITS.gap lines in the new text ends it.
function chains(pairs, lines) {
  const out = [];
  for (const [i, j] of pairs) {
    const d = j - i;
    const c = out.find((x) => Math.abs(x.d - d) <= 12 && i >= x.lastI && lines[i] <= lines[x.end - 1] + LIMITS.gap + 1);
    if (!c) { out.push({ start: i, end: i + WINDOW, covered: WINDOW, d, lastI: i, jlo: j, jhi: j + WINDOW }); continue; }
    if (i === c.lastI && d === c.d) continue;
    c.covered += Math.max(0, i + WINDOW - Math.max(i, c.end));
    c.end = Math.max(c.end, i + WINDOW);
    c.d = d;
    c.lastI = i;
    c.jlo = Math.min(c.jlo, j);
    c.jhi = Math.max(c.jhi, j + WINDOW);
  }
  return out;
}

// using lines, includes, imports and one-line constants name things: two files that open alike hold no logic to extract, and writing the names out is worse (KF-32).
const DECLARATION = /^\s*(?:$|using\b|#\s*include\b|import\b|from\s+\S+\s+import\b|namespace\b|[{}]\s*$|(?:static\s+|inline\s+)*(?:constexpr|const)\b[^(){}]*=[^(){}]*;\s*$)/;
const MIN_LOGIC_LINES = 3;
const holdsLogic = (text, { start, end }) => text.split('\n').slice(start - 1, end).filter((l) => !DECLARATION.test(l)).length >= MIN_LOGIC_LINES;

export function judgeWrites(root, writes, { layout = {}, shape = null, ignore = [] } = {}) {
  const index = loadIndex(root, { layout, shape });
  const maybe = clonesIn(index, writes, { ignore });
  if (!maybe.length) return { clones: [], index };
  const tmp = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'once-only-new-'));
  try {
    const extra = writes.map((w, i) => {
      const path = join(tmp, String(i), basename(w.path));
      mkdirSync(join(tmp, String(i)), { recursive: true });
      writeFileSync(path, w.after);
      return { path, as: w.path };
    });
    const written = new Set(writes.map((w) => real(w.path)));
    const paths = [...new Set(maybe.map((c) => c.other.file))].filter((f) => !written.has(real(f)));
    const r = scan(root, { extra, ignore, layout, shape, paths });
    if (r.error) return { clones: [], error: r.error, index };
    return { clones: writes.flatMap((w) => (w.ranges ?? [w.range]).flatMap((range) => clonesOf(r.clones, w.path, range)).filter((c) => holdsLogic(w.after, c.at))), index };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
