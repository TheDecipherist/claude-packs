// shape: the one reader of design/shape.json and the number rule (claude-packs 0.9.0; KWB-1: a hard-coded "slot 2" came
// from one spec sentence, spread through briefs and tests, and got past a check scoped to the engine folders).
// Everything in a project is ONE (a fixed thing, reached by a frozen id) or MANY (N instances of one shape, reached only by
// a generator or a loop). A literal instance of a concept, anywhere, is allowed only as an example, a selector or a constant;
// anything else is refused with "example, rule, or constant?". Every shape hook reads the manifest through this file, which
// holds the finder and the messages and re-exports the rest (typescript W3 L3 split it by job):
//   shape-model   the manifest: readShape, normaliseShape, validateShape, parts, SHAPE_FILE, EMPTY_SHAPE
//   shape-lines   what a line says: isExampleLine, named, classify, conceptOfName, conceptOfType
//   shape-hits    the literals one line holds for one concept
//   shape-lists   a hand-listed set, one line per instance
//   findInstanceLiterals(text, file, shape, { only }) -> [{ line, text, concept, instance, why }]
//     only: 'example' (just a seen in / example line excuses), 'brief' (that, or a declared constant read by name)
import { logRefusal } from './hook-log.mts';
import { matchesAny } from './glob.mts';
import { blankPaths } from './shape-prose.mts';
import { handLists } from './shape-lists.mts';
import type { InstanceFinding } from './shape-lists.mts';
import { aliasesOf, classify, conceptOfExpr } from './shape-lines.mts';
import { lineHits } from './shape-hits.mts';
import { SHAPE_FILE } from './shape-model.mts';
import type { LoadedShape } from './shape-model.mts';

export * from './shape-model.mts';
export * from './shape-lines.mts';
export type { InstanceFinding } from './shape-lists.mts';
export type { LineHit } from './shape-hits.mts';

export const ASK = 'example, rule, or constant?';
const HINT = '(an example goes on a "seen in:" line; a rule is a selector in design/shape.json; a constant is a named row there)';

export const isExcluded = (rel: string, shape: Pick<LoadedShape, 'exclude'> | null | undefined): boolean => rel === SHAPE_FILE || matchesAny(rel, shape?.exclude ?? []);
export const isTestFile = (rel: string): boolean => /(^|\/)(test|tests|probes)\//.test(rel) || /test|_probe/i.test(rel.split('/').pop() ?? '');

export type FindMode = 'example' | 'brief' | null;

export function findInstanceLiterals(text: string | null | undefined, file: string | null | undefined, shape: LoadedShape | null | undefined, { only = null }: { only?: FindMode } = {}): InstanceFinding[] {
  if (!shape || !text) return [];
  const concepts = Object.values(shape.concepts).filter((c) => c.shape === 'many' || (c.shape === 'one' && c.id));
  let body = only === 'brief' ? blankPaths(text) : text; // in a brief, a path names a file (KWB-117)
  for (const c of concepts) for (const q of c.quotes) body = body.split(q).join(' '.repeat(q.length));
  const lines = body.split('\n');
  const shown = text.split('\n');
  const aliases = aliasesOf(body, shape);
  const out: InstanceFinding[] = [];
  const seen = new Set<string>();
  let inSwitch: string | null = null;
  lines.forEach((line, i) => {
    const sw = line.match(/\bswitch\s*\(([^)]*)\)/);
    if (sw) inSwitch = conceptOfExpr((sw[1] ?? '').trim(), shape, aliases);
    for (const c of concepts) {
      const cls = classify(line, c, shape);
      // only 'brief': an example or a declared constant read by name excuses it (the number rule's third form), a selector does not
      if (cls === 'example' || (cls === 'constant' && only === 'brief') || (cls && only !== 'example' && only !== 'brief')) continue;
      const once = new Set<string>();
      for (const h of lineHits(line, c, shape, aliases, inSwitch, file)) {
        if (once.has(h.instance)) continue;
        once.add(h.instance);
        seen.add(`${i}|${c.name}`);
        out.push({ line: i + 1, text: (shown[i] ?? '').trim(), concept: c.name, instance: h.instance, why: h.why, ...(h.call === undefined ? {} : { call: h.call }) });
      }
    }
  });
  for (const c of concepts) handLists(lines, c, out, seen);
  return out.sort((a, b) => a.line - b.line);
}

/** What a finding is keyed by when two texts are compared: what it names, not the line it is on. */
interface Keyed { concept: string; instance: string; why: string }

// The findings an edit adds: those in the text after it, beyond the same findings already in the text before it.
// Keyed by what a finding names, not its line's text: an edited or moved line adds nothing; one more copy does (KWB-23).
export function addedFindings<F extends Keyed>(before: string | null | undefined, after: string | null | undefined, find: (text: string) => F[]): F[] {
  const key = (f: Keyed): string => `${f.concept}|${f.instance}|${f.why}`;
  const had = new Map<string, number>();
  for (const f of find(before ?? '')) had.set(key(f), (had.get(key(f)) ?? 0) + 1);
  return find(after ?? '').filter((f) => { const n = had.get(key(f)) ?? 0; if (n > 0) { had.set(key(f), n - 1); return false; } return true; });
}

/** A finding as a refusal line. `kind` is set by shape-code's findings, whose `why` is the whole message. */
export interface FormattedFinding { line: number; text: string; concept: string; instance: string; why: string; kind?: string }

export function formatFinding(f: FormattedFinding, file: string): string {
  const tail = f.kind ? f.why : `names ${f.concept} instance ${f.instance} — ${ASK} ${HINT}\n      ${f.why}`;
  return `${file}:${f.line}: "${f.text.length > 140 ? `${f.text.slice(0, 137)}...` : f.text}" ${tail}`;
}

/** The manifest row as one line, for a refusal or a brief to quote. */
export function quoteRow(name: string, shape: LoadedShape | null | undefined): string {
  const c = shape?.concepts?.[name];
  return c ? `${SHAPE_FILE} "${name}": ${JSON.stringify(c.row)}` : `${SHAPE_FILE} has no row "${name}"`;
}

export { logRefusal };
