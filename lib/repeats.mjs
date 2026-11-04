// What a project repeats, for `scan`: every shape written by hand more than once, the copies of it, and what it should become. A run seen as
// many overlapping windows is reported once, from its first window.
import { extname } from 'node:path';
import { TEMPLATE, TESTS, copiesNeeded, shapesOf, skippedBy } from '../packs/base/hooks/lib/elements.mjs';
import { parametersOf } from '../packs/base/hooks/lib/code-shapes.mjs';
import { matchesAny } from '../packs/base/hooks/lib/glob.mjs';

const copiesOf = (group) => new Set(group.map((x) => `${x.rel}:${x.line}`)).size;
const oneName = (group) => new Set(group.map((x) => x.what)).size === 1;
const isRepeat = (g) => copiesOf(g) >= copiesNeeded(g[0], oneName(g)) && (g[0].kind !== 'setup' || !sameObject(g));
// One object set up twice in one file is one object.
const sameObject = (g) => new Set(g.map((x) => `${x.rel} ${x.what}`)).size < 2;

function firstWindows(groups) {
  const seen = new Set(groups.filter((g) => g[0].kind === 'run').map((g) => g.map((x) => `${x.rel}:${x.at}`).join()));
  return groups.filter((g) => g[0].kind !== 'run' || !seen.has(g.map((x) => `${x.rel}:${x.at - 1}`).join()));
}

export function repeatedShapes(texts, layout = {}) {
  const by = new Map();
  for (const [rel, text] of texts) {
    if (matchesAny(rel, [...TESTS, ...skippedBy(layout)])) continue;
    for (const s of shapesOf(text, extname(rel))) by.set(s.id, [...(by.get(s.id) ?? []), { ...s, rel }]);
  }
  const source = new Map(texts);
  return firstWindows([...by.values()].filter(isRepeat)).sort((a, b) => b.length * b[0].nodes - a.length * a[0].nodes).map((g) => {
    const [a, b] = g;
    return { kind: g[0].kind, what: g[0].what, copies: g.length, at: g.map((x) => `${x.rel}:${x.line}`), template: TEMPLATE[g[0].kind],
      parameters: g[0].kind === 'run' ? parametersOf(a.id, source.get(a.rel), source.get(b.rel)).slice(0, 6) : [] };
  });
}

export const repeatLine = (r) => `  - ${r.copies}x ${r.what}: ${r.at.slice(0, 4).join(', ')}${r.copies > 4 ? ', ...' : ''}. Make it ${r.template}${r.parameters.length ? ` (differs in: ${r.parameters.join(', ').replace(/`/g, "'")})` : ''}`;
