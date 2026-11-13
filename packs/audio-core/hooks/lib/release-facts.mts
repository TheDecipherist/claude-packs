import { join } from 'node:path';
import { readText } from './files.mts';
import { readJson } from './json.mts';
import { sourcesOf } from './param-sources.mts';
import type { IdConfig } from './param-sources.mts';

// What a saved patch or a DAW song depends on, read from the sources and compared with the release's snapshot.
// A parameter's range text (min, max, step, skew) is read as written in its declaration, whitespace removed: a named range
// variable is locked by its name only. The parameter ORDER is never locked (JUCE's VST3 wrapper hashes each ParamID from its string id).

/** One parameter's locked facts: its kind, its range (float: the range expression; int: min and max) and a choice list in order. */
export interface ParamFacts { kind: string; range?: string; choices?: string[] }
/** The snapshot a release writes. `patchFormat` is a list (a version constant, a field list) and `programs` maps number to name. */
export interface Snapshot { released: string; params: Record<string, ParamFacts>; patchFormat: string[]; programs: Record<string, string> }
/** `.claude/release-lock.config.json`: where the patch format and the factory bank are read. */
interface FactConfig { patchFormat: RegExp[]; programs: { file: string; number: number; name: number } }

export const SNAPSHOT_FILE = join('.claude', 'release.lock.json');
const DECLARATION = /AudioParameter(Float|Int|Bool|Choice)\b[^(]*\(/g;
const DEFAULT_PATCH_FORMAT = ['\\b(?:k?[Pp]atch(?:Format)?Version|PATCH_VERSION)\\b\\s*(?:=|\\{)\\s*([^;,}\\n]+)'];

/** The top-level arguments of the call whose `(` is at `open`, split at commas outside brackets and strings. */
function argumentsAt(text: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0;
  let start = open + 1;
  let quote = false;
  for (let i = open; i < text.length; i++) {
    const c = text.charAt(i);
    if (quote) { if (c === '\\') i++; else if (c === '"') quote = false; continue; }
    if (c === '"') quote = true;
    else if (c === '(' || c === '{' || c === '[') depth++;
    else if ((c === ')' || c === '}' || c === ']') && --depth === 0) { args.push(text.slice(start, i)); return args; }
    else if (c === ',' && depth === 1) { args.push(text.slice(start, i)); start = i + 1; }
  }
  return args;
}

const compact = (s: string | undefined): string => (s ?? '').replace(/\s+/g, '');
const literals = (s: string): string[] => [...s.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1] ?? '');

/** Every parameter declared in the sources: id to facts. The id is the first string literal of the call. */
function paramFacts(root: string, config: IdConfig): Record<string, ParamFacts> {
  const found: Record<string, ParamFacts> = {};
  for (const file of sourcesOf(root, config.extensions)) {
    const text = readText(file) ?? '';
    for (const m of text.matchAll(DECLARATION)) {
      const args = argumentsAt(text, m.index + m[0].length - 1);
      const id = literals(args[0] ?? '')[0];
      if (!id) continue;
      const kind = m[1] ?? '';
      const facts: ParamFacts = { kind };
      if (kind === 'Float') facts.range = compact(args[2]);
      else if (kind === 'Int') facts.range = compact(`${args[2] ?? ''},${args[3] ?? ''}`);
      else if (kind === 'Choice') {
        const list = literals(args[2] ?? '');
        facts.choices = list.length ? list : [compact(args[2])];
      }
      found[id] = facts;
    }
  }
  return found;
}

function factConfig(root: string): FactConfig {
  const raw = readJson<Record<string, unknown>>(join(root, '.claude', 'release-lock.config.json'), {}) ?? {};
  const patterns = Array.isArray(raw.patchFormat) ? raw.patchFormat.map(String) : DEFAULT_PATCH_FORMAT;
  const p = (raw.programs ?? {}) as Record<string, unknown>;
  return {
    patchFormat: patterns.map((s) => new RegExp(s, 'gm')),
    programs: { file: typeof p.file === 'string' ? p.file : 'data/factory.csv', number: Number(p.number ?? 0), name: Number(p.name ?? 1) },
  };
}

/** The factory bank's program file, relative to the project: judged when a write lands in it. */
export const programsFile = (root: string): string => factConfig(root).programs.file;

const cells = (line: string): string[] => [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)].map((m) => (m[1] ?? '').replace(/^"|"$/g, '').trim());

function programsOf(root: string, c: FactConfig['programs']): Record<string, string> {
  const rows: Record<string, string> = {};
  for (const line of (readText(join(root, c.file)) ?? '').split(/\r?\n/)) {
    const cell = cells(line);
    const number = cell[c.number] ?? '';
    if (/^\d+$/.test(number)) rows[number] = cell[c.name] ?? '';
  }
  return rows;
}

function patchFormatOf(root: string, config: IdConfig, patterns: RegExp[]): string[] {
  const values: string[] = [];
  for (const file of sourcesOf(root, config.extensions)) {
    const text = readText(file) ?? '';
    for (const re of patterns) { re.lastIndex = 0; for (const m of text.matchAll(re)) values.push((m[1] ?? '').trim()); }
  }
  return values;
}

/** What the project holds now, in the shape of the release's snapshot. */
export function releaseSnapshot(root: string, config: IdConfig): Snapshot {
  const c = factConfig(root);
  return { released: new Date().toISOString(), params: paramFacts(root, config), patchFormat: patchFormatOf(root, config, c.patchFormat), programs: programsOf(root, c.programs) };
}

/** The first index where `now` stops starting with `locked`, or -1 when `locked` is a prefix of it (an append). */
const divergence = (locked: readonly string[], now: readonly string[]): number => locked.findIndex((v, i) => now[i] !== v);

/** Each way `now` changes what `locked` froze. Additions are not among them. The ids themselves belong to param-id-lock. */
export function changesSince(locked: Snapshot, now: Snapshot): string[] {
  const said: string[] = [];
  for (const [id, was] of Object.entries(locked.params)) {
    const is = now.params[id];
    if (!is) continue;
    if (is.kind !== was.kind) said.push(`${id}: kind ${was.kind} became ${is.kind}`);
    if (was.range !== undefined && is.range !== was.range) said.push(`${id}: range, step or skew ${was.range} became ${is.range ?? 'none'}`);
    if (was.choices) {
      const at = divergence(was.choices, is.choices ?? []);
      if (at >= 0) said.push(`${id}: choice ${at} was "${was.choices[at]}", now "${is.choices?.[at] ?? '(gone)'}"; only appending at the end is allowed`);
    }
  }
  const at = divergence(locked.patchFormat, now.patchFormat);
  if (at >= 0) said.push(`patch format: entry ${at} was "${locked.patchFormat[at]}", now "${now.patchFormat[at] ?? '(gone)'}"`);
  for (const [number, name] of Object.entries(locked.programs)) {
    if (now.programs[number] !== name) said.push(`program ${number} was "${name}", now ${number in now.programs ? `"${now.programs[number]}"` : 'gone'}; a program keeps its number, new ones append`);
  }
  return said;
}
