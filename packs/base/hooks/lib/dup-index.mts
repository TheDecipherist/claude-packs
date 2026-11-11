// dup-index: once-only's detector at write time (KWB-24). jscpd read the whole repo on every source write; this keeps an
// index instead, built once and updated for the files that changed since, so a write costs one walk of the folders (a stat
// of each source file, no reading) and a lookup, never a rescan.
//   The index: per source file (lib/dup.mts: SOURCE, its excludes, the same files jscpd judged), the hash of every window of
//   WINDOW tokens (comments and blank space left out, as jscpd's mild mode) and the line each token is on; kept in
//   $TMPDIR/claude-packs-dup-index/<checkout>.json, keyed by modification time and size. A file that changed is read again;
//   one that is gone leaves.
//   A candidate clone: the windows of the new text that are also in one other file, chained in order along one diagonal (a
//   line changed inside a copy moves it by a few tokens; a gap of up to LIMITS.gap lines), covering LOOSE.tokens tokens over
//   LOOSE.lines lines on either side, a little under jscpd's LIMITS (lib/dup.mts) so the candidates hold every clone jscpd
//   finds (measured on a C++ project's 752 sources: all 55 files jscpd flags are among them). A window found in more than COMMON
//   places is boilerplate and never starts a match.
//   loadIndex(root, { layout, shape }) -> { root, files: { rel: { h, l } }, built, read }   (read: files tokenized this call)
//   clonesIn(index, writes, { ignore }) -> [{ at, other, lines, tokens }]  writes: [{ path, after, range | ranges }] (the changed
//       lines, [lo, hi] each; one write per path), sides { file, start, end }
//   judgeCopyWrites(root, writes, { env, layout, shape, ignore }) -> { clones, error, index }: the index finds the candidates
//       (it is looser than jscpd: a superset, measured on a C++ project's tree), then jscpd confirms on those files alone, so a
//       write is refused when jscpd over the repo would refuse it, and a write with no candidate never starts jscpd. `env` is
//       the caller's (where jscpd is found); nothing here reads the process. (Named for its job: spec-lock has a judgeWrites.)
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative } from 'node:path';
import { clonesOf, excludeGlobs, LIMITS, realPath, scan, SOURCE } from './dup.mts';
import type { BlockClone, Env } from './dup.mts';
import { scratchDir } from './files.mts';
import { matchesAny } from './glob.mts';
import { shortHash } from './hash.mts';
import { parseJson, writeJson } from './json.mts';
import type { Layout, ShapeManifest } from './types.d.mts';

export const WINDOW = 20;
const COMMON = 40;
// A candidate is looser than jscpd's clone (it counts tokens and lines its own way: a block jscpd reads as 7 lines can be 5
// here), so nothing jscpd would refuse is missed; jscpd then judges the candidates (judgeCopyWrites).
const LOOSE = { tokens: Math.round(LIMITS.tokens * 0.8), lines: LIMITS.lines - 2 };
const MAX_BYTES = 512 * 1024; // a table or a blob, not code anyone copies by hand
const VERSION = 1;

const C_LIKE = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|\d[\w.]*|\S/g;
const PY = /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|[A-Za-z_]\w*|\d[\w.]*|\S/g;

/** One source file in the index: its stat key (modification time, size), the hash of each window and the line of each token. */
export interface IndexedFile { m: number; s: number; h: number[]; l: number[] }
export interface DupIndex {
  /** The checkout's real path. */
  root: string;
  files: Record<string, IndexedFile>;
  /** True when no index file was read: this call built it all. */
  built: boolean;
  /** Files tokenized this call. */
  read: number;
}
/** What a write leaves: its path, its whole text and the changed lines ([lo, hi], 1-based) as one range or several. */
export interface DupWrite {
  path: string;
  after: string;
  range?: readonly [number, number] | null;
  ranges?: readonly (readonly [number, number])[];
}
export interface JudgeOptions { env: Env; layout?: Partial<Layout>; shape?: ShapeManifest | null; ignore?: readonly string[] }
export interface JudgeResult { clones: BlockClone[]; error?: string; index: DupIndex }
export interface Tokens { t: string[]; l: number[] }

/** The text's tokens (comments left out) and the line each is on. */
export function tokenize(text: string, path: string): Tokens {
  const python = /\.py$/i.test(path);
  const re = new RegExp((python ? PY : C_LIKE).source, 'g');
  const t: string[] = [];
  const l: number[] = [];
  let line = 1;
  let at = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    for (let i = at; i < start; i += 1) if (text.charCodeAt(i) === 10) line += 1;
    const s = m[0];
    const comment = s.startsWith('//') || s.startsWith('/*') || (s.startsWith('#') && python);
    if (!comment) { t.push(s); l.push(line); }
    for (let i = 0; i < s.length; i += 1) if (s.charCodeAt(i) === 10) line += 1;
    at = start + s.length;
  }
  return { t, l };
}

/** FNV-1a over a window's tokens, one number per window start. */
export function windows(t: readonly string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + WINDOW <= t.length; i += 1) {
    let h = 0x811c9dc5;
    for (let k = i; k < i + WINDOW; k += 1) {
      const s = t[k] ?? '';
      for (let c = 0; c < s.length; c += 1) { h ^= s.charCodeAt(c); h = Math.imul(h, 0x01000193); }
      h ^= 0x1f; h = Math.imul(h, 0x01000193);
    }
    out.push(h >>> 0);
  }
  return out;
}

// The index file of a checkout, in the system's temp folder (which honours TMPDIR); sha1's first 16 digits, as before.
const fileOf = (root: string): string => join(tmpdir(), 'claude-packs-dup-index', `${shortHash(realPath(root), 16)}.json`);

interface Stat { m: number; s: number }

/** Every source file under root that the index judges: { rel: { m, s } }. Folders an exclude covers are never entered. */
function sourceStats(root: string, ex: readonly string[]): Record<string, Stat> {
  const out: Record<string, Stat> = {};
  const go = (dir: string, rel: string): void => {
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

interface StoredIndex { v?: number; root?: string; files: Record<string, IndexedFile> }

/** The checkout's index, read from the temp folder and brought up to date for the files that changed. */
export function loadIndex(root: string, { layout = {}, shape = null }: { layout?: Partial<Layout>; shape?: ShapeManifest | null } = {}): DupIndex {
  const file = fileOf(root);
  const real = realPath(root);
  // read whole, not through readText: a big checkout's index is past its 8 MB cap
  let text: string | null = null;
  try { text = readFileSync(file, 'utf8'); } catch { /* built below */ }
  let old = parseJson<StoredIndex>(text);
  if (old?.v !== VERSION || old.root !== real || typeof old.files !== 'object') old = null;
  const ex = excludeGlobs(layout, shape);
  const now = sourceStats(root, ex);
  const files: Record<string, IndexedFile> = {};
  let read = 0;
  for (const [rel, st] of Object.entries(now)) {
    const was = old?.files[rel];
    if (was && was.m === st.m && was.s === st.s) { files[rel] = was; continue; }
    let source = '';
    try { source = readFileSync(join(root, rel), 'utf8'); } catch { continue; }
    const { t, l } = tokenize(source, rel);
    files[rel] = { m: st.m, s: st.s, h: windows(t), l };
    read += 1;
  }
  const changed = read > 0 || !old || Object.keys(old.files).length !== Object.keys(files).length;
  if (changed) {
    try { mkdirSync(join(file, '..'), { recursive: true }); } catch { /* judged all the same */ }
    writeJson(file, { v: VERSION, root: real, files });   // false when refused: judged all the same
  }
  return { root: real, files, built: !old, read };
}

interface Other { file: string; h: number[]; l: number[]; self?: boolean }
interface Chain { start: number; end: number; covered: number; d: number; lastI: number; jlo: number; jhi: number }

/** The clones the writes add: each write's windows on its changed lines, against every other file (the index, minus the
 *  written files and `ignore`; each other write of the call as it will be; the write itself elsewhere in its own text). */
export function clonesIn(index: DupIndex, writes: readonly DupWrite[], { ignore = [] }: { ignore?: readonly string[] } = {}): BlockClone[] {
  const skip = new Set([...ignore, ...writes.map((w) => w.path)].map((p) => relative(index.root, realPath(p))));
  const texts = writes.map((w) => { const { t, l } = tokenize(w.after, w.path); return { w, l, h: windows(t), n: t.length }; });
  const found: BlockClone[] = [];
  for (const q of texts) {
    const ranges = q.w.ranges ?? (q.w.range ? [q.w.range] : []);
    const want = new Map<number, number[]>();
    for (let i = 0; i < q.h.length; i += 1) {
      const first = q.l[i] ?? 0;
      const last = q.l[i + WINDOW - 1] ?? 0;
      if (!ranges.some(([lo, hi]) => first <= hi && last >= lo)) continue;
      const hash = q.h[i] ?? 0;
      const at = want.get(hash);
      if (at) at.push(i); else want.set(hash, [i]);
    }
    if (!want.size) continue;
    const others: Other[] = [];
    for (const [rel, f] of Object.entries(index.files)) if (!skip.has(rel)) others.push({ file: join(index.root, rel), h: f.h, l: f.l });
    for (const o of texts) others.push({ file: realPath(o.w.path), h: o.h, l: o.l, self: o === q });
    const pairs = new Map<Other, [number, number][]>();
    const seen = new Map<number, number>();
    for (const o of others) {
      for (let j = 0; j < o.h.length; j += 1) {
        const hash = o.h[j] ?? 0;
        const is = want.get(hash);
        if (!is) continue;
        seen.set(hash, (seen.get(hash) ?? 0) + 1);
        for (const i of is) {
          if (o.self && Math.abs(i - j) < WINDOW) continue;
          const list = pairs.get(o);
          if (list) list.push([i, j]); else pairs.set(o, [[i, j]]);
        }
      }
    }
    for (const [o, ps] of pairs) {
      const real = ps.filter(([i]) => (seen.get(q.h[i] ?? 0) ?? 0) <= COMMON).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      for (const c of chains(real, q.l)) {
        // either side's lines (jscpd counts a block written on 3 long lines that repeats one of 7 lines)
        const qStart = q.l[c.start] ?? 0;
        const qEnd = q.l[c.end - 1] ?? 0;
        const oStart = o.l[c.jlo] ?? 0;
        const oEnd = o.l[c.jhi - 1] ?? 0;
        const lines = Math.max(qEnd - qStart + 1, oEnd - oStart + 1);
        if (c.covered < LOOSE.tokens || lines < LOOSE.lines) continue;
        found.push({ at: { file: realPath(q.w.path), start: qStart, end: qEnd }, other: { file: o.file, start: oStart, end: oEnd }, lines, tokens: c.covered });
      }
    }
  }
  return found;
}

/** Matched window pairs [i (new), j (other)], sorted by i, chained along a diagonal: a change of a few tokens inside a copy
 *  keeps it one chain; a gap of more than LIMITS.gap lines in the new text ends it. */
function chains(pairs: readonly (readonly [number, number])[], lines: readonly number[]): Chain[] {
  const out: Chain[] = [];
  for (const [i, j] of pairs) {
    const d = j - i;
    const c = out.find((x) => Math.abs(x.d - d) <= 12 && i >= x.lastI && (lines[i] ?? 0) <= (lines[x.end - 1] ?? 0) + LIMITS.gap + 1);
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
const holdsLogic = (text: string, { start, end }: { start: number; end: number }): boolean =>
  text.split('\n').slice(start - 1, end).filter((l) => !DECLARATION.test(l)).length >= MIN_LOGIC_LINES;

/** The clones the writes would add, as jscpd over the repo would find them: the index picks the candidates, jscpd confirms. */
export function judgeCopyWrites(root: string, writes: readonly DupWrite[], { env, layout = {}, shape = null, ignore = [] }: JudgeOptions): JudgeResult {
  const index = loadIndex(root, { layout, shape });
  const maybe = clonesIn(index, writes, { ignore });
  if (!maybe.length) return { clones: [], index };
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
    if (r.error) return { clones: [], error: r.error, index };
    const ranged = (w: DupWrite): (readonly [number, number])[] => [...(w.ranges ?? (w.range ? [w.range] : []))];
    return { clones: writes.flatMap((w) => ranged(w).flatMap((range) => clonesOf(r.clones, w.path, range)).filter((c) => holdsLogic(w.after, c.at))), index };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
