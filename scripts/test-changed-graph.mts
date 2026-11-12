// How test-changed reads the repo: the graph of what imports what, and the choice of tests a change reaches, each with its reason.
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { usesAny } from './changed-functions.mts';
import { pathTests } from './test-changed-paths.mts';
import { GENERIC, HOOK, HUBS, MAX_HOPS, MODULE, SKIP_DIRS, TABLE, TEST } from './test-changed-table.mts';
import { walk as walkFolder } from '../packs/base/hooks/lib/files.mts';
import { emittedFrom } from '../packs/base/hooks/lib/source-exts.mts';

export const posix = (p: string): string => p.split(sep).join('/');

/** Every file of the repo, as a posix path from the root, its folders that are no part of it left out. */
const walk = (root: string): string[] => walkFolder(root, (name) => SKIP_DIRS.has(name)).map((abs) => posix(relative(root, abs)));

// Relative specifiers a module reaches: imports and new URL(..., import.meta.url); a template keeps its text before `${`.
function references(root: string, rel: string): string[] {
  const text = readFileSync(join(root, rel), 'utf8');
  const specs = [
    ...text.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]*)['"]/g), ...text.matchAll(/\bimport\s*\(\s*['"`](\.{1,2}\/[^'"`$]*)/g),
    ...text.matchAll(/\bimport\s+['"](\.{1,2}\/[^'"]*)['"]/g), ...text.matchAll(/new URL\(\s*['"`](\.{1,2}\/?[^'"`$]*)/g),
  ].flatMap((m) => (m[1] === undefined ? [] : [m[1]]));
  return specs.map((s) => posix(relative(root, resolve(root, dirname(rel), s)))).filter((p) => p && !p.startsWith('..'));
}

/** The repo's files and, for each, the modules that reference it. */
export interface Graph { files: string[]; importers: Map<string, string[]> }

// A module and the files it references; an import of an emitted .mjs reaches its .mts, the file that is edited (W2.6, d-2),
// and an emitted file is no module of its own (its source is).
export function graph(root: string): Graph {
  const files = walk(root);
  const listed = new Set(files);
  const sourceOf = (f: string): string | null => emittedFrom(f, (candidate) => listed.has(candidate));
  const modules = files.filter((f) => MODULE.test(f) && !sourceOf(f));
  const importers = new Map<string, string[]>();
  for (const m of modules) {
    for (const named of references(root, m)) {
      const ref = sourceOf(named) ?? named;
      // a FOLDER a module builds a path from (`new URL('../../packs', import.meta.url)`) reaches the modules under it, never its data:
      // a generated manifest or a rule is no code the module runs, and the table says which tests hold them (W9, KWB-166: the
      // regenerated manifest of a one-hook change picked 91 test files through hook-rig's `packs` folder)
      const inside = (f: string): boolean => ref !== '' && f.startsWith(`${ref.replace(/\/$/, '')}/`) && MODULE.test(f);
      const targets = files.filter((f) => f === ref || inside(f));
      for (const t of targets) importers.set(t, [...(importers.get(t) ?? []), m]);
    }
  }
  return { files, importers };
}

/** Every module that imports `file`, directly or through others (the file itself left out). */
export function importersOf(file: string, importers: ReadonlyMap<string, readonly string[]>): Set<string> {
  const found = new Set<string>();
  const pending = [file];
  for (let at = pending.pop(); at !== undefined; at = pending.pop()) for (const by of importers.get(at) ?? []) if (by !== file && !found.has(by)) { found.add(by); pending.push(by); }
  return found;
}

/** What a change reaches: the tests chosen with their reasons, the changed files no test covers, and every test file. */
export interface Choice { chosen: Map<string, string[]>; uncovered: string[]; tests: string[] }

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** changed: repo-relative paths; status: path to 'A' | 'M' | 'D' | 'R' from git (an untracked file is 'A'); fnNames: path to the
 *  functions the diff touched, where known. */
export function choose(root: string, changed: readonly string[], g: Graph = graph(root), status: Readonly<Record<string, string>> = {}, fnNames: Readonly<Record<string, ReadonlySet<string>>> = {}): Choice {
  const tests = g.files.filter((f) => TEST.test(f)).sort();
  const text = Object.fromEntries(tests.map((t) => [t, readFileSync(join(root, t), 'utf8')]));
  const textOf = (t: string): string => text[t] ?? '';
  const chosen = new Map<string, string[]>();
  const add = (t: string, why: string): void => {
    const reasons = chosen.get(t) ?? [];
    if (!reasons.includes(why)) reasons.push(why);
    chosen.set(t, reasons);
  };
  const uncovered: string[] = [];
  const helpers = g.files.filter((f) => /^test\/.*\.m[jt]s$/.test(f) && !TEST.test(f));
  const helperText = Object.fromEntries(helpers.map((h) => [h, readFileSync(join(root, h), 'utf8')]));
  const importsOf = (t: string): Set<string> => new Set([...g.importers.entries()].filter(([, by]) => by.includes(t)).map(([f]) => f));
  const namesIt = (body: string, c: string): boolean => { const b = c.split('/').pop() ?? ''; return !GENERIC.has(b) && b.length > 5 && new RegExp(`['"\`]${escapeRe(b)}['"\`]`).test(body); };
  for (const c of changed) {
    let hit = false;
    if (tests.includes(c)) { add(c, 'changed'); hit = true; }
    // importers, transitively, with the chain kept for the reason
    // a test covers what it imports itself or through one helper, never through the CLI hub, which imports nearly all of lib/ (KWB-166:
    // every test that runs the CLI "reached" every module; a module used everywhere is not a module every test checks)
    const seen = new Map<string, string | null>([[c, null]]);
    const depth = new Map<string, number>([[c, 0]]);
    const queue = [c];
    while (queue.length) {
      const f = queue.shift() ?? '';
      const here = depth.get(f) ?? 0;
      if (HUBS.has(f) || here >= MAX_HOPS) continue;
      for (const m of g.importers.get(f) ?? []) if (!seen.has(m)) { seen.set(m, f); depth.set(m, here + 1); queue.push(m); }
    }
    const names = fnNames[c];   // KWB-166: the functions the diff touched in this module, when known
    // a bare or namespace import of the module uses all of it (`import '../lib/b.mjs'`, `import * as m from ...`)
    const whole = (t: string): boolean => new RegExp(`import\\s*(?:\\*\\s*as\\s+\\w+\\s+from\\s*)?['"][^'"]*${(c.split('/').pop() ?? '').replace(/\./g, '\\.')}['"]`).test(textOf(t));
    const usesChanged = (t: string): boolean => !names || whole(t) || usesAny(textOf(t) + [...importsOf(t)].map((h) => helperText[h] ?? '').join('\n'), names);
    if (names && names.size === 0) { uncovered.push(`${c} (imports or comments only)`); continue; }
    // d-7: the path function, the tier a test lives in and the manifest's `tests` and `requires`
    for (const [t, why] of pathTests(root, c, g.files, (f) => importersOf(f, g.importers))) { add(t, why); hit = true; }
    // a hook is run by its own test and proved by its selftest, never imported: what a test names of it is not a test of it (d-7)
    const byContent = HOOK.test(c) ? [] : tests;
    for (const t of byContent) if (t !== c && seen.has(t) && usesChanged(t)) {
      const chain: string[] = [];
      for (let f = seen.get(t); f; f = seen.get(f)) chain.push(f);
      add(t, chain.length > 1 ? `reaches ${c} through ${chain.slice(0, -1).join(' → ')}` : `reaches ${c}`); hit = true;
    }
    const base = c.split('/').pop() ?? '';
    for (const t of byContent) {
      if (seen.has(t)) continue; // already reached by import
      // a named FILE covers it; a folder a test builds a path from (`packs/`, `${KIT}/packs/base/`) covers nothing by itself (KWB-166)
      const named = [...textOf(t).matchAll(/['"`]((?:\.\.\/)?(?:packs|lib|bin|global|profiles|prompts|scripts|test|\.claude)\/[^'"`$]*)(.)/g)]
        .filter((m) => m[2] !== '$' && !(m[1] ?? '').endsWith('/') && /\.[\w]+$/.test(m[1] ?? ''))
        .map((m) => (m[1] ?? '').replace(/^\.\.\//, '')).find((p) => c === p);
      if (named) { add(t, `names ${named === c ? c : `${named} (holds ${c})`}`); hit = true; }
      else if (!GENERIC.has(base) && base.length > 5 && new RegExp(`[/'"\`\\s]${escapeRe(base)}['"\`\\s)]`).test(textOf(t))) { add(t, `names ${base} (${c})`); hit = true; }
    }
    // a helper under test/ that names the file (worktree-cases-commands.mjs names each hook) covers it for every test importing it
    for (const h of helpers) if (namesIt(helperText[h] ?? '', c)) for (const t of byContent) if (importsOf(t).has(h)) { add(t, `names ${c} through ${h}`); hit = true; }
    for (const row of TABLE) if (row.files.test(c) && (row.when?.(c, status[c] ?? 'M') ?? true)) for (const t of tests) if (row.tests(textOf(t), c, root, t)) { add(t, `${c}: ${row.why}`); hit = true; }
    if (!hit) uncovered.push(c);
  }
  return { chosen, uncovered, tests };
}
