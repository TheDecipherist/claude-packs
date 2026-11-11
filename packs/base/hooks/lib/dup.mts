// dup: the one copy-paste reader (once-only at write time, making-check at the end of a turn, doctor's count and
// `claude-packs dup scan`). Code that exists once is called, never copied: a near-duplicate of a block already in the repo
// is refused with where the first one lives (0.9.0 item 9).
//
// The detector is jscpd (5.4.2, an optional dependency of the kit: a Rust binary). Measured on a C++ repo of 580 C++,
// Python and JS sources: 0.3 s for the whole tree, so it runs at write time; a planted copy of a function with one line
// changed is found as one near-miss clone (--max-gap-lines). Threshold: 50 tokens and 6 lines, a gap of up to 2 lines.
//   findJscpd(env, starts) -> path | null  env.CLAUDE_PACKS_JSCPD, then node_modules/.bin/jscpd above each start, then env.PATH
//       (the env is the caller's: nothing here reads the process)
//   scan(root, { env, extra, layout, shape, paths }) -> { clones, ms, error }   paths: only these files (once-only's confirmation), else the tree
//       extra: [{ path, as }] files outside the tree judged as if they were `as` (the text a write would leave), `as`
//       itself left out of the scan; ignore: more paths left out (a file a move takes away). Clone sides are
//       { file, start, end }, `file` the real path in the repo (`as` for extra).
//   changedLines(before, after) -> [lo, hi] | null   the lines of after that differ (1-based), null when none do
//   isSource(rel), isGenerated(text), excludeGlobs(layout, shape)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchesAny } from './glob.mts';
import { isJunk, scratchDir, walk } from './files.mts';
import { parseJson } from './json.mts';
import { real as realFolder } from './project.mts';
import { extPattern } from './source-exts.mts';
import type { Layout, ShapeManifest } from './types.d.mts';

/** What the copy reader takes from design/shape.json: its excluded paths (a ShapeManifest, or the loaded shape, has them). */
export type ShapeExclude = Pick<ShapeManifest, 'exclude'>;

/** The environment a caller passes: never this process's by default. */
export type Env = Readonly<Record<string, string | undefined>>;
/** One side of a clone: a file and its lines (1-based). */
export interface CloneSide { file: string; start: number; end: number }
export interface Clone { a: CloneSide; b: CloneSide; lines: number; tokens: number }
/** A clone of a block: `at` is the side inside the block, `other` the side anywhere. */
export interface BlockClone { at: CloneSide; other: CloneSide; lines: number; tokens: number }
export interface ScanResult { clones: Clone[]; ms?: number; error?: string; sources?: number }
export interface ScanOptions {
  /** The caller's environment: where jscpd is found (CLAUDE_PACKS_JSCPD, PATH) and which temp folder holds its report. */
  env: Env;
  /** Files outside the tree judged as if they were `as`. */
  extra?: readonly { path: string; as: string }[];
  /** More paths left out (a file a move takes away). */
  ignore?: readonly string[];
  layout?: Partial<Layout>;
  shape?: ShapeExclude | null;
  jscpd?: string | null;
  timeoutMs?: number;
  /** Only these files (once-only's confirmation), else the tree. */
  paths?: readonly string[] | null;
}
export interface RepoClonesOptions { env: Env; layout?: Partial<Layout>; shape?: ShapeExclude | null; jscpd?: string | null }

export const LIMITS = { tokens: 50, lines: 6, gap: 2 };
export const SOURCE: RegExp = extPattern('c', 'cpp', 'objc', 'python', 'js', 'ts', 'rust');
const FORMATS = 'c,c-header,cpp,cpp-header,objectivec,python,javascript,jsx,typescript,tsx,rust';
// Import statements are never a copy: they cannot be made one function (KWB-176; languages.mjs's notCode leaves them out too).
// jscpd takes the patterns comma-separated, so none holds a comma.
const IMPORT_LINES = [String.raw`import\s[^;]*;`, String.raw`export\s[^;]*\sfrom\s[^;]*;`, String.raw`#include\s.*`,
  String.raw`(from\s+\S+\s+)?import\s.*`, String.raw`use\s[^;]*;`].join(',');
// A header and a source are one language: a function copied from a .cpp into a .h is a copy (jscpd compares within a format otherwise).
const CROSS = 'c,c-header,cpp,cpp-header,objectivec;javascript,jsx,typescript,tsx';
// Generated files, resources and vendored or built code are never judged (and never a match).
export const DEFAULT_EXCLUDE: readonly string[] = [
  '.git/**', '.claude/**', 'node_modules/**', '**/node_modules/**', 'third_party/**', '**/third_party/**', 'JUCE/**', '**/JUCE/**',
  'out/**', 'build/**', '**/resources/**', '**/Resources/**', '**/generated/**', '**/*.generated.*', '**/*_generated.*', '**/BinaryData.*',
];
export const FIX = 'call it, or extract one function that both call, parameterized over what differs';

export const isSource = (rel: string): boolean => SOURCE.test(rel);
export const isGenerated = (text: string | null | undefined): boolean => /\b(?:auto-?generated|generated by|do not edit|DO NOT EDIT|@generated)\b/i.test((text ?? '').split('\n').slice(0, 6).join('\n'));

export function excludeGlobs(layout: Partial<Layout> = {}, shape: ShapeExclude | null = null): string[] {
  const out: string[] = [...DEFAULT_EXCLUDE];
  const build: unknown = layout.buildOutput;
  const globs = Array.isArray(build) ? build : build ? [build] : [];
  for (const g of globs) if (typeof g === 'string') out.push(g);
  for (const g of shape?.exclude ?? []) out.push(g);
  out.push('design/shape.json');
  return [...new Set(out)].filter((g) => !g.includes(',')); // jscpd takes one comma-separated list
}

// The folders of kind "copy" (another project's code, copied unchanged): a match there is real, but a clone with both
// sides inside copies is the other project's, never counted here.
export const copyGlobs = (layout: Partial<Layout> = {}): string[] => Object.values(layout.folders ?? {}).filter((f) => f.kind === 'copy').map((f) => `${f.path.replace(/\/+$/, '')}/**`);

/** jscpd's binary: the env's CLAUDE_PACKS_JSCPD, else node_modules/.bin/jscpd above each start (and above this file), else the env's PATH. */
export function findJscpd(env: Env, starts: readonly string[] = []): string | null {
  const named = env.CLAUDE_PACKS_JSCPD;
  if (named && existsSync(named)) return named;
  const here = dirname(fileURLToPath(import.meta.url));
  for (const s of [...starts, here]) {
    let d = resolve(s);
    for (;;) {
      for (const c of ['node_modules/.bin/jscpd', 'node_modules/@thedecipherist/claude-packs/node_modules/.bin/jscpd']) if (existsSync(join(d, c))) return join(d, c);
      const up = dirname(d);
      if (up === d) break;
      d = up;
    }
  }
  for (const p of (env.PATH ?? '').split(delimiter)) if (p && existsSync(join(p, 'jscpd'))) return join(p, 'jscpd');
  return null;
}

/** The lines of `after` that differ from `before` (1-based, [lo, hi]); null when none do. */
export function changedLines(before: string | null | undefined, after: string | null | undefined): [number, number] | null {
  if (after === null || after === undefined || before === after) return null;
  const a = (before ?? '').split('\n');
  const b = after.split('\n');
  let top = 0;
  while (top < a.length && top < b.length && a[top] === b[top]) top += 1;
  let tail = 0;
  while (tail < a.length - top && tail < b.length - top && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail += 1;
  const lo = top + 1;
  const hi = b.length - tail;
  return hi >= lo ? [lo, hi] : null; // a pure deletion adds no line
}

// Real paths: /var and /private/var are one folder on a Mac, and jscpd prints the real one. project.mts's `real` is the
// owner of resolving links; a file that does not exist yet (the one a write would make) takes its nearest folder's real path.
export function realPath(p: string): string {
  const abs = resolve(p);
  const folder = dirname(abs);
  if (existsSync(abs) || folder === abs) return realFolder(abs);
  return join(realPath(folder), abs.slice(folder.length + 1));
}

// The files a TypeScript build emitted beside their sources: the build's output, never a copy in the repo (KWB-170).
const TWIN: Readonly<Record<string, string>> = { '.mts': '.mjs', '.cts': '.cjs', '.ts': '.js', '.tsx': '.js' };
const NOT_WALKED = (name: string): boolean => name === 'node_modules' || name === '.git' || isJunk(name);
function emittedTwins(abs: string): string[] {
  return walk(abs, NOT_WALKED).filter((f) => /\.(?:mts|cts|tsx|ts)$/.test(f) && !f.endsWith('.d.mts'))
    .map((f) => f.replace(/\.(?:mts|cts|tsx|ts)$/, (ext) => TWIN[ext] ?? ext)).filter((twin) => existsSync(twin));
}

interface JscpdFile { name: string; start: number; end: number }
interface JscpdReport { duplicates?: { firstFile: JscpdFile; secondFile: JscpdFile; lines: number; tokens: number }[]; statistics?: { total?: { sources?: number } } }

export function scan(root: string, { env, extra = [], ignore: alsoIgnore = [], layout = {}, shape = null, jscpd = null, timeoutMs = 8000, paths = null }: ScanOptions): ScanResult {
  const bin = jscpd ?? findJscpd(env, [root]);
  if (!bin) return { clones: [], error: 'jscpd not found (it is an optional dependency of @thedecipherist/claude-packs: npm install in the project, or set CLAUDE_PACKS_JSCPD)' };
  const out = scratchDir('once-only-');
  const abs = realPath(root);
  const ignore = [...excludeGlobs(layout, shape).map((g) => `${abs}/${g}`), ...extra.map((x) => realPath(x.as)), ...alsoIgnore.map(realPath), ...emittedTwins(abs)];
  const args = ['-a', '-s', '-k', String(LIMITS.tokens), '-l', String(LIMITS.lines), '--max-gap-lines', String(LIMITS.gap), '--exit-code', '0',
    '-f', FORMATS, '-r', 'json', '-o', out, '--cross-formats', CROSS, '-i', ignore.join(','), '--ignore-pattern', IMPORT_LINES, ...(paths ?? [abs]), ...extra.map((x) => x.path)];
  const t0 = Date.now();
  const r = spawnSync(bin, args, { encoding: 'utf8', timeout: timeoutMs, cwd: abs, env: { ...env } });
  const ms = Date.now() - t0;
  let report: JscpdReport | null = null;
  try { report = parseJson<JscpdReport>(readFileSync(join(out, 'jscpd-report.json'), 'utf8')); } catch { /* read below */ }
  rmSync(out, { recursive: true, force: true });
  if (!report) return { clones: [], ms, error: `jscpd gave no report (exit ${r.status}${r.signal ? `, ${r.signal}` : ''}): ${(r.stderr || r.error?.message || '').split('\n')[0]}` };
  const back = new Map(extra.map((x) => [realPath(x.path), realPath(x.as)]));
  const side = (f: JscpdFile): CloneSide => { const p = realPath(resolve(abs, f.name)); return { file: back.get(p) ?? p, start: f.start, end: f.end }; };
  const clones = (report.duplicates ?? []).map((d) => ({ a: side(d.firstFile), b: side(d.secondFile), lines: d.lines, tokens: d.tokens }));
  return { clones, ms, sources: report.statistics?.total?.sources ?? 0 };
}

// The clones a block adds: one side in `file` overlapping [lo, hi], the other side anywhere (another copy in the same
// file included).
export function clonesOf(clones: readonly Clone[], file: string, [lo, hi]: readonly [number, number]): BlockClone[] {
  const f = realPath(file);
  const hits = (s: CloneSide): boolean => s.file === f && s.start <= hi && s.end >= lo;
  const out: BlockClone[] = [];
  for (const c of clones) {
    if (hits(c.a)) out.push({ at: c.a, other: c.b, lines: c.lines, tokens: c.tokens });
    else if (hits(c.b)) out.push({ at: c.b, other: c.a, lines: c.lines, tokens: c.tokens });
  }
  return out;
}

// Every clone of a repo, both sides inside copy trees left out. `rel` makes the paths relative for printing.
export function repoClones(root: string, { env, layout = {}, shape = null, jscpd = null }: RepoClonesOptions): ScanResult {
  const r = scan(root, { env, layout, shape, jscpd, timeoutMs: 120000 });
  const copies = copyGlobs(layout);
  const base = realPath(root);
  const rel = (p: string): string => (p.startsWith(`${base}/`) ? p.slice(base.length + 1) : p);
  const clones = r.clones
    .map((c) => ({ ...c, a: { ...c.a, file: rel(c.a.file) }, b: { ...c.b, file: rel(c.b.file) } }))
    .filter((c) => !(matchesAny(c.a.file, copies) && matchesAny(c.b.file, copies)));
  return { ...r, clones };
}
