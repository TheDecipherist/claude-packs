#!/usr/bin/env node
// The reset census (reset-before-apply): every stateful module of the engine has its fate on a patch load in the reset
// map, so no module carries the last patch's state because nobody named it. A module is a class or struct in the
// given source folders that declares a reset(); the map names each with its fate, "cleared" or "carried", and the
// source that says so (the find-the-reset map's [FW] entry, or the schematic's on an analog machine).
//   node reset-census.mjs <reset-map.json> <source folder>... [--json]
// The map: { "modules": { "<Class>": { "fate": "cleared" | "carried", "source": "[FW] h8:0x1234" } } }
// Exit 1 when a module is missing from the map, an entry has no fate or no source, or an entry names no module found.
// Found in supernova2_monitor (its B-185): a program load flushed the notes and left the comb's delay lines ringing,
// and the reset-before-apply check passed because the load called a reset.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';
import { toJson } from '../hooks/lib/json.mts';

const SOURCE = /\.(?:h|hh|hpp|cpp|cc|cxx|mm)$/;
const FATES = new Set(['cleared', 'carried']);
const CLASS_HEAD = /\b(?:class|struct)\s+(\w+)\b[^;{()]*\{/g;
const DECLARES_RESET = /\b(?:void|bool)\s+reset\s*\(/;

/** Every source file under `dir`, depth first, in name order. */
function sourcesIn(dir: string): string[] {
  return readdirSync(dir).sort().flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourcesIn(path);
    return SOURCE.test(name) ? [path] : [];
  });
}

/** The body of the class whose opening brace is at `open` in `text`: up to its matching close. */
function bodyFrom(text: string, open: number): string {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}' && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
}

/** The classes and structs in `text` whose own body declares a reset(), a nested class's reset counted for it alone. */
export function statefulIn(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(CLASS_HEAD)) {
    const name = m[1];
    const body = bodyFrom(text, (m.index ?? 0) + m[0].length - 1);
    // a nested class's own reset belongs to it: blank each nested body before reading this one's
    let own = body;
    for (const nested of body.matchAll(CLASS_HEAD)) own = own.replace(bodyFrom(body, (nested.index ?? 0) + nested[0].length - 1), '');
    if (name !== undefined && DECLARES_RESET.test(own)) found.push(name);
  }
  return found;
}

export interface Census {
  modules: string[];
  missing: string[];
  incomplete: string[];
  stale: string[];
}

/** The census of the modules in `folders` against `map`. */
export function census(map: { modules?: Record<string, { fate?: string; source?: string }> }, folders: readonly string[]): Census {
  const modules = [...new Set(folders.flatMap((f) => sourcesIn(f)).flatMap((p) => statefulIn(readFileSync(p, 'utf8'))))].sort();
  const entries = map.modules ?? {};
  return {
    modules,
    missing: modules.filter((m) => !(m in entries)),
    incomplete: Object.entries(entries).filter(([, e]) => !FATES.has(e.fate ?? '') || !(e.source ?? '').trim()).map(([m]) => m),
    stale: Object.keys(entries).filter((m) => !modules.includes(m)),
  };
}

export function main(args: readonly string[], out: (line: string) => void, err: (line: string) => void): number {
  const json = args.includes('--json');
  const [mapPath, ...folders] = args.filter((a) => a !== '--json');
  if (!mapPath || folders.length === 0) {
    err('usage: reset-census.mjs <reset-map.json> <source folder>... [--json]');
    return 2;
  }
  const c = census(JSON.parse(readFileSync(mapPath, 'utf8')), folders);
  if (json) out(toJson(c));
  out(`reset census: ${c.modules.length} stateful modules in ${folders.join(', ')}; ${c.modules.length - c.missing.length} of ${c.modules.length} in the map`);
  for (const m of c.missing) out(`  MISSING ${m}: a module with state the map gives no fate (cleared or carried) on a patch load`);
  for (const m of c.incomplete) out(`  INCOMPLETE ${m}: its entry needs a fate, "cleared" or "carried", and the source that says so`);
  for (const m of c.stale) out(`  STALE ${m}: the map names it and no module in the folders declares a reset()`);
  if (c.modules.length === 0) {
    err('reset census: no stateful module found: the folders hold no class that declares reset(), so the census measured nothing');
    return 1;
  }
  return c.missing.length + c.incomplete.length + c.stale.length === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) process.exitCode = main(process.argv.slice(2), (l) => console.log(l), (l) => console.error(l));
