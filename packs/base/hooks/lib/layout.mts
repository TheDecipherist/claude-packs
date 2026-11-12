// .claude/layout.json is the one source of truth for where things live:
//   { "folders": { name: { "path", "purpose" } }, "concepts": { concept: [folderName | glob, ...] } }
// Rules, lesson checks, the folder-law hook and the CLAUDE.md layout section all read it. Nothing is kept between calls:
// a layout read is always the file as it is now (no memo, so no stale one).
import { join } from 'node:path';
import { readText } from './files.mts';
import { allWithModuleForms } from './glob.mts';
import { parseJson } from './json.mts';
import type { Layout, LayoutFolder } from './types.d.mts';

const EMPTY = (): Layout => ({ folders: {}, concepts: {} });

/** The project's layout; an empty one when the file is missing or is not JSON. */
export function readLayout(root: string): Layout {
  const text = readText(join(root, '.claude', 'layout.json'));
  if (text === null) return EMPTY();
  const parsed = parseJson<Layout | null>(text, null);
  return parsed !== null && typeof parsed === 'object' ? parsed : EMPTY();
}

// A concept entry is a folder name (expands to "<path>/**"), "kind:<k>" (every folder whose
// "kind" is k, e.g. "kind:copy" for the copy trees; none is no glob), or a raw glob.
export function conceptGlobs(layout: Layout, concept: string): string[] | null {
  const entries = layout.concepts?.[concept];
  if (!entries) return null;
  const out: string[] = [];
  for (const e of entries) {
    const folder: LayoutFolder | undefined = layout.folders?.[e];
    const globs = folder ? [`${folder.path}/**`] : e.startsWith('kind:') ? foldersOfKind(layout, e.slice(5)).map((p) => `${p}/**`) : [e];
    for (const glob of globs) if (!out.includes(glob)) out.push(glob);
  }
  return allWithModuleForms(out);   // KWB-198: a TypeScript glob names .mts and .cts too
}

// The paths of every layout folder of one kind ("copy": read-only copies of another project's code).
export function foldersOfKind(layout: Layout, kind: string): string[] {
  return Object.values(layout.folders ?? {}).filter((f) => f.kind === kind).map((f) => f.path.replace(/\/+$/, ''));
}

// Concepts from packs that aren't installed (e.g. "world" in a project without the stellix pack)
// are skipped; a rule must still resolve to at least one glob.
export function globsForConcepts(layout: Layout, concepts: readonly string[]): string[] {
  const out: string[] = [];
  for (const c of concepts) for (const g of conceptGlobs(layout, c) ?? []) if (!out.includes(g)) out.push(g);
  if (out.length === 0) throw new Error(`none of the concepts [${concepts.join(', ')}] exist in .claude/layout.json`);
  return out;
}

// Folders that may hold source code: every folder except docs/tools, deepest first.
// src/ is a code folder unless the layout names folders inside it: then a file belongs in one of those (KWB-78: a Python project's src/new.py was refused).
export function codeFolders(layout: Layout): string[] {
  const folders = Object.entries(layout.folders ?? {});
  const src = layout.folders?.['src']?.path;
  const split = folders.some(([, f]) => f.path.startsWith(`${src}/`));
  return folders
    .filter(([name]) => !['docs', 'tools'].includes(name) && !(name === 'src' && split))
    .map(([, f]) => f.path)
    .sort((a, b) => b.length - a.length);
}

// "@alias" entries in a check's exclude/globs resolve to layout.files[alias]; other entries pass through.
export function resolveAliases(layout: Layout, entries: readonly string[] = []): string[] {
  return entries.map((e) => (e.startsWith('@') ? layout.files?.[e.slice(1)] ?? `__missing_alias_${e.slice(1)}__` : e));
}
