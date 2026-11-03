// .claude/layout.json is the one source of truth for where things live:
//   { "folders": { name: { "path", "purpose" } }, "concepts": { concept: [folderName | glob, ...] } }
// Rules, lesson checks, the folder-law hook and the CLAUDE.md layout section all read it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readLayout(root) {
  try {
    return JSON.parse(readFileSync(join(root, '.claude', 'layout.json'), 'utf8'));
  } catch {
    return { folders: {}, concepts: {} };
  }
}

// A concept entry is a folder name (expands to "<path>/**"), "kind:<k>" (every folder whose
// "kind" is k, e.g. "kind:copy" for the copy trees; none is no glob), or a raw glob.
export function conceptGlobs(layout, concept) {
  const entries = layout.concepts?.[concept];
  if (!entries) return null;
  const out = [];
  for (const e of entries) {
    const folder = layout.folders?.[e];
    const globs = folder ? [`${folder.path}/**`] : e.startsWith('kind:') ? foldersOfKind(layout, e.slice(5)).map((p) => `${p}/**`) : [e];
    for (const glob of globs) if (!out.includes(glob)) out.push(glob);
  }
  return out;
}

// The paths of every layout folder of one kind ("copy": read-only copies of another project's code).
export function foldersOfKind(layout, kind) {
  return Object.values(layout.folders ?? {}).filter((f) => f.kind === kind).map((f) => f.path.replace(/\/+$/, ''));
}

// Concepts from packs that aren't installed (e.g. "world" in a project without the stellix pack)
// are skipped; a rule must still resolve to at least one glob.
export function globsForConcepts(layout, concepts) {
  const out = [];
  for (const c of concepts) for (const g of conceptGlobs(layout, c) ?? []) if (!out.includes(g)) out.push(g);
  if (out.length === 0) throw new Error(`none of the concepts [${concepts.join(', ')}] exist in .claude/layout.json`);
  return out;
}

// Folders that may hold source code: every folder except docs/tools, deepest first.
export function codeFolders(layout) {
  return Object.entries(layout.folders ?? {})
    .filter(([name]) => !['docs', 'tools', 'src'].includes(name))
    .map(([, f]) => f.path)
    .sort((a, b) => b.length - a.length);
}

// "@alias" entries in a check's exclude/globs resolve to layout.files[alias]; other entries pass through.
export function resolveAliases(layout, entries = []) {
  return entries.map((e) => (e.startsWith('@') ? layout.files?.[e.slice(1)] ?? `__missing_alias_${e.slice(1)}__` : e));
}
