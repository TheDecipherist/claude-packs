// What making-check reads of a step's words: which concepts of design/shape.json a text touches, which concepts a `making:` line
// names that the manifest does not know, and the making lines of build.md's In progress section. Split out of the hook
// (typescript W4) so the hook stays small; it reads files only through the root it is given.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { LoadedShape, ShapeConceptData } from './shape.mts';

const NOT_CONCEPTS: ReadonlySet<string> = new Set(['none', 'no', '-', 'n/a', 'one', 'many', 'ids']);

const splitName = (name: string): string[] => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
// each identifier's parts, and the identifier whole: a concept named editPage is the word editpage, not the words edit and page (KF-19, KF-39)
const partsOf = (text: string): Set<string> => new Set((text.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).flatMap((w) => [...splitName(w), w.toLowerCase()]));
const wordsOf = (name: string, c: ShapeConceptData): string[] => [name.toLowerCase(), ...c.words];
const matches = (pattern: string, text: string): boolean => { try { return new RegExp(pattern).test(text); } catch { return false; } };

// The concepts a text touches: a word of the concept as a word or a part of an identifier, a code pattern, a per-instance
// array, the generator.
export function conceptsIn(text: string, shape: Pick<LoadedShape, 'concepts'> | null): Set<string> {
  const parts = partsOf(text);
  const out = new Set<string>();
  for (const [name, c] of Object.entries(shape?.concepts ?? {})) {
    const patterns = Array.isArray(c.row['patterns']) ? c.row['patterns'] : [];
    const hit = wordsOf(name, c).some((w) => parts.has(w))
      || patterns.some((p) => matches(String(p), text))
      || c.arrays.some((a) => new RegExp(`\\b${a}\\b`).test(text))
      || (c.generatorName !== null && new RegExp(`\\b${c.generatorName}\\s*\\(`).test(text));
    if (hit) out.add(name);
  }
  return out;
}

// The concepts listed after "concepts:" on a making line that the manifest does not know.
export function unknownConcepts(making: string, shape: Pick<LoadedShape, 'concepts'> | null): string[] {
  const known = new Set(Object.entries(shape?.concepts ?? {}).flatMap(([n, c]) => wordsOf(n, c)));
  const out: string[] = [];
  // bracketed text goes first, nested brackets too, so a ";" inside a shape ("slot (many, 4; slotId(i, field))") does not end the list (KWB-17)
  let flat = making;
  for (let prev: string | undefined; prev !== flat;) { prev = flat; flat = flat.replace(/\([^()]*\)/g, ' '); }
  // the list runs to `reuse:` or the line's end, and a shape word after a concept ("editKnob, many") is what the rule asks for (KF-24)
  for (const m of flat.matchAll(/\bconcepts?\s*:\s*(.*?)(?=\breuse\s*:|\||$)/gim)) {
    for (const item of (m[1] ?? '').split(/[,;]/)) {
      const w = item.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (w && !NOT_CONCEPTS.has(w) && !known.has(w)) out.push(w);
    }
  }
  return out;
}

const headBranch = (gitDir: string): string => {
  try { return readFileSync(join(gitDir, 'HEAD'), 'utf8').match(/^ref:\s*refs\/heads\/(.+)$/m)?.[1]?.trim() ?? 'HEAD'; } catch { return ''; }
};

// The checkout's branch from its HEAD file (a worktree's .git file names its git dir): no git process (KWB-24: on a loaded
// machine each one took half a second)
function branchOf(root: string): string {
  try {
    let dir = join(root, '.git');
    const dotGit = readFileSync(dir, 'utf8').match(/^gitdir:\s*(.+)$/m); // a worktree; a folder throws and is read below
    if (dotGit?.[1]) dir = resolve(root, dotGit[1].trim());
    return headBranch(dir);
  } catch { return headBranch(join(root, '.git')); }
}

const fromMaking = (l: string): string => l.slice(l.search(/\bmaking:/i));

/** The making lines of build.md's In progress section: those on this branch's entry, else every one there. `project` is the
 *  main checkout, whose build.md is read when the checkout has none. */
export function makingLines(root: string, project: string): string[] {
  const file = [join(root, 'build.md'), join(project, 'build.md')].find((f) => existsSync(f));
  if (!file) return [];
  const text = readFileSync(file, 'utf8');
  const at = text.search(/^##\s+In progress\b/im);
  if (at < 0) return [];
  const section: string[] = [];
  for (const l of text.slice(at).split('\n').slice(1)) { if (/^##\s/.test(l)) break; section.push(l); }
  const lines = section.filter((l) => /\bmaking:/i.test(l)).map(fromMaking);
  const branch = branchOf(root);
  const mine = branch && branch !== 'HEAD' ? section.filter((l) => /\bmaking:/i.test(l) && (l.includes(branch) || l.includes(branch.split('/').pop() ?? branch))).map(fromMaking) : [];
  return mine.length ? mine : lines;
}
