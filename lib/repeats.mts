// What a project repeats, for `scan`: every shape written by hand more than once, the copies of it, and what it should become. A run seen as
// many overlapping windows is reported once, from its first window.
import { extname } from 'node:path';
import { TEMPLATE, TESTS, copiesNeeded, shapesOf, skippedBy } from '../packs/base/hooks/lib/elements.mts';
import type { Shape } from '../packs/base/hooks/lib/elements.mts';
import { parametersOf } from '../packs/base/hooks/lib/code-shapes.mts';
import { languageOf } from '../packs/base/hooks/lib/languages.mts';
import { definesOf, fingerprint, nearCopy } from '../packs/base/hooks/lib/near-copies.mts';
import { matchesAny } from '../packs/base/hooks/lib/glob.mts';
import type { Layout } from '../packs/base/hooks/lib/types.d.mts';

/** A project's files as [path inside the project, text] pairs. */
export type Texts = readonly (readonly [rel: string, text: string])[];

type Found = Shape & { rel: string };
type Group = readonly Found[];

/** One shape written by hand more than once. */
export interface Repeat { kind: Shape['kind']; what: string; copies: number; at: string[]; template: string; parameters: string[] }

const copiesOf = (group: Group): number => new Set(group.map((x) => `${x.rel}:${x.line}`)).size;
const oneName = (group: Group): boolean => new Set(group.map((x) => x.what)).size === 1;
// One object set up twice in one file is one object.
const sameObject = (g: Group): boolean => new Set(g.map((x) => `${x.rel} ${x.what}`)).size < 2;
const isRepeat = (g: Group): boolean => {
  const first = g[0];
  return first !== undefined && copiesOf(g) >= copiesNeeded(first, oneName(g)) && (first.kind !== 'setup' || !sameObject(g));
};
/** Where a window of a run starts; only a run has one. */
const startOf = (x: Found): number | undefined => (x.kind === 'run' ? x.at : undefined);
const isRun = (g: Group): boolean => g[0]?.kind === 'run';

function firstWindows(groups: readonly Group[]): Group[] {
  const seen = new Set(groups.filter(isRun).map((g) => g.map((x) => `${x.rel}:${startOf(x)}`).join()));
  return groups.filter((g) => !isRun(g) || !seen.has(g.map((x) => `${x.rel}:${(startOf(x) ?? Number.NaN) - 1}`).join()));
}

const weight = (g: Group): number => g.length * (g[0]?.nodes ?? 0);

export function repeatedShapes(texts: Texts, layout: Partial<Layout> = {}): Repeat[] {
  const by = new Map<string, Found[]>();
  for (const [rel, text] of texts) {
    if (matchesAny(rel, [...TESTS, ...skippedBy(layout)])) continue;
    for (const s of shapesOf(text, extname(rel))) {
      const group = by.get(s.id) ?? [];
      group.push({ ...s, rel });
      by.set(s.id, group);
    }
  }
  const source = new Map(texts);
  return firstWindows([...by.values()].filter(isRepeat)).sort((a, b) => weight(b) - weight(a)).flatMap((g): Repeat[] => {
    const [a, b] = g;
    if (!a) return [];
    const parameters = a.kind === 'run' && b ? parametersOf(a.id, source.get(a.rel) ?? '', source.get(b.rel) ?? '', extname(a.rel)).slice(0, 6) : [];
    return [{ kind: a.kind, what: a.what, copies: g.length, at: g.map((x) => `${x.rel}:${x.line}`), template: TEMPLATE[a.kind], parameters }];
  });
}

export const repeatLine = (r: Repeat): string => `  - ${r.copies}x ${r.what}: ${r.at.slice(0, 4).join(', ')}${r.copies > 4 ? ', ...' : ''}. Make it ${r.template}${r.parameters.length ? ` (differs in: ${r.parameters.join(', ').replace(/`/g, "'")})` : ''}`;

const sourceTexts = (texts: Texts, layout: Partial<Layout>): Texts => texts.filter(([rel]) => languageOf(extname(rel)) && !matchesAny(rel, [...TESTS, ...skippedBy(layout)]));

/** A file that holds most of another, in order, with other names. */
export interface NearCopyRow { file: string; line: number; other: string; from: number; to: number; matched: number; of: number }

/** Files that hold most of another, in order, with other names. A pair is reported once. */
export function nearCopies(texts: Texts, layout: Partial<Layout> = {}): NearCopyRow[] {
  const all = sourceTexts(texts, layout).map(([file, text]) => ({ file, st: fingerprint(text, extname(file)), lang: languageOf(extname(file)) }));
  const seen = new Set<string>();
  const out: NearCopyRow[] = [];
  for (const x of all) {
    const hit = nearCopy(x.st, all.filter((o) => o !== x && o.lang === x.lang));
    if (!hit || seen.has(`${hit.file} ${x.file}`)) continue;
    seen.add(`${x.file} ${hit.file}`);
    out.push({ file: x.file, line: hit.line, other: hit.file, from: hit.from, to: hit.to, matched: hit.matched, of: hit.of });
  }
  return out.sort((a, b) => b.matched - a.matched);
}

/** A compound name defined in two or three files. */
export interface RemadeName { name: string; at: string[] }

/** Compound names defined in two or three files: a helper made again. More files than that is a convention. */
export function remadeNames(texts: Texts, layout: Partial<Layout> = {}): RemadeName[] {
  const by = new Map<string, RemadeName>();
  for (const [rel, text] of sourceTexts(texts, layout)) {
    const lang = languageOf(extname(rel));
    for (const [name, line] of definesOf(text, extname(rel))) {
      if (!/[a-z0-9][A-Z]|[a-z0-9]_[a-z0-9]/.test(name)) continue;
      const key = `${lang?.name} ${name}`;
      const made = by.get(key) ?? { name, at: [] };
      made.at.push(`${rel}:${line}`);
      by.set(key, made);
    }
  }
  return [...by.values()].filter((m) => m.at.length >= 2 && m.at.length <= 3 && new Set(m.at.map((a) => a.split(':')[0])).size >= 2);
}
