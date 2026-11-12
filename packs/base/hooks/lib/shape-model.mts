// shape-model: design/shape.json as the shape hooks hold it (claude-packs 0.9.0; KWB-1). Split out of shape.mts at its line limit
// (typescript W3 L3): what the file is, how a row is compiled, and what makes a manifest valid.
//   readShape(root) -> shape | null            null: no design/shape.json; shape.error: it does not parse
//   normaliseShape(json) -> shape              the manifest compiled: words, patterns, selectors, constants as lists
//   validateShape(shape) -> [problem]          the rows that break the contract (doctor)
//   parts(name) -> [word]                      an identifier as lower-case parts
// The manifest: { "concepts": { name: row }, "exclude": [globs], "values": [type names] }. "values" (optional, KWB-10) lists
// plain value types (a cell, a texture, a landing) that hold an index member or sit in an array of N but are values, not
// instances of a concept: shape-law's new-type check skips them (shape.values, a Set). doctor: a list of strings.
// A row's "names" (optional, KWB-12) lists the identity names of a many concept's instances when each is a different KIND
// (planet: DELAY, FILTER, REVERB): frozen IDs, not instance numbers. The role-name check ("the PAD slot") allows a listed
// name before the concept word ("the DELAY planet"); an unlisted uppercase word is still a role. doctor: a list of strings.
import { join } from 'node:path';
import { asRecord, isRecord, parseJson } from './json.mts';
import { readText } from './files.mts';

export const SHAPE_FILE = 'design/shape.json';
export const EMPTY_SHAPE: { concepts: Record<string, never>; exclude: string[] } = { concepts: {}, exclude: ['out/**', 'build/**', 'third_party/**', 'JUCE/**', 'node_modules/**'] };

/** A manifest row as written: any field may be missing or the wrong kind, so each is read through a narrowing. */
export type ShapeRowData = Readonly<Record<string, unknown>>;

/** One concept of the manifest, compiled once: its words, patterns and the names of its selectors and constants. */
export interface ShapeConceptData {
  name: string;
  row: ShapeRowData;
  shape: unknown;
  count: number | null;
  id: unknown;
  words: string[];
  plural: Set<string>;
  single: string[];
  patterns: RegExp[];
  badPatterns: string[];
  arrays: string[];
  generatorName: string | null;
  names: Set<string>;
  selectors: string[];
  constants: string[];
  quotes: string[];
}

/** The manifest as loaded. `error` is set (and `concepts` empty) when the file does not parse. */
export interface LoadedShape {
  concepts: Record<string, ShapeConceptData>;
  exclude: string[];
  values?: Set<string>;
  json?: unknown;
  error?: string;
}

/** An object, or an empty one. Arrays are not objects here: a shape file holding a list where a table belongs reads as no rows
 *  (before W10 an array passed as a record; its keys were its indexes, which matched nothing). */
const recordOf = (v: unknown): Record<string, unknown> => asRecord(v) ?? {};
const isWhole = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** An identifier as lower-case parts: "kSlotNames" -> k slot names; "slot2Gain" -> slot 2 gain. */
export const parts = (name: string): string[] => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  .replace(/([A-Za-z])(\d)/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function compile(name: string, row: ShapeRowData): ShapeConceptData {
  const listed = Array.isArray(row.words) && row.words.length > 0 ? row.words : [name, `${name}s`];
  const words = listed.map((w) => String(w).toLowerCase());
  const plural = new Set(words.filter((w) => words.some((s) => s !== w && (w === `${s}s` || w === `${s}es`))));
  const single = words.filter((w) => !plural.has(w));
  const patterns: RegExp[] = [];
  const bad: string[] = [];
  for (const p of Array.isArray(row.patterns) ? row.patterns : []) {
    try { patterns.push(new RegExp(String(p), 'g')); } catch (e) { bad.push(`${String(p)}: ${e instanceof Error ? e.message : String(e)}`); }
  }
  const generatorName = String(row.generator ?? '').match(/^\s*([A-Za-z_]\w*)\s*\(/)?.[1] ?? null;
  const selectors = recordOf(row.selectors);
  const constants = recordOf(row.constants);
  return {
    name, row, shape: row.shape, count: isWhole(row.count) ? row.count : null, id: row.id ?? null,
    words, plural, single: single.length > 0 ? single : words, patterns, badPatterns: bad,
    arrays: strings(row.arrays), generatorName,
    names: new Set(strings(row.names).map((n) => n.toUpperCase())),
    selectors: Object.keys(selectors), constants: Object.keys(constants),
    // manifest prose (a constant's reason, a selector's description) quoted in a brief is never an instance literal
    quotes: [...(Array.isArray(row.senses) ? row.senses : []), ...Object.values(constants).map((c) => recordOf(c).reason), ...Object.values(selectors)]
      .filter((q): q is string => typeof q === 'string' && q.length > 3),
  };
}

export function normaliseShape(json: unknown): LoadedShape {
  const top = recordOf(json);
  const concepts: Record<string, ShapeConceptData> = {};
  const raw = isRecord(top.concepts) ? top.concepts : {};
  for (const [name, row] of Object.entries(raw)) concepts[name] = compile(name, recordOf(row));
  return { concepts, exclude: Array.isArray(top.exclude) ? strings(top.exclude) : [], values: new Set(strings(top.values)), json };
}

const UNPARSED: unique symbol = Symbol('unparsed');

/** The manifest of `root`: null when there is no design/shape.json; with `error` set when it does not parse. */
export function readShape(root: string): LoadedShape | null {
  const text = readText(join(root, SHAPE_FILE));
  if (text === null) return null;
  const json = parseJson<unknown>(text, UNPARSED);
  return json === UNPARSED ? { concepts: {}, exclude: [], error: `${SHAPE_FILE} does not parse` } : normaliseShape(json);
}

const nonEmpty = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';

function conceptProblems(c: ShapeConceptData): string[] {
  const at = `${SHAPE_FILE} "${c.name}"`;
  const out: string[] = [];
  const row = c.row;
  if (!['one', 'many', 'ids'].includes(String(c.shape))) out.push(`${at}: shape must be "one", "many" or "ids" (different things by ID, KWB-16) (is ${JSON.stringify(c.shape)})`);
  if (c.shape === 'many' && !nonEmpty(row.generator)) out.push(`${at}: a many concept needs its generator (the one way an instance's id is made, e.g. "${c.name}Id(i, field)")`);
  if (row.count !== undefined && !(isWhole(row.count) && row.count > 0)) out.push(`${at}: count must be a whole number above 0`);
  if (c.shape === 'one' && row.count !== undefined) out.push(`${at}: a one concept has no count`);
  for (const b of c.badPatterns) out.push(`${at}: pattern does not compile: ${b}`);
  if (row.selectors !== undefined && (typeof row.selectors !== 'object' || Array.isArray(row.selectors))) out.push(`${at}: selectors must be { name: "what it picks" }`);
  for (const [k, v] of Object.entries(recordOf(row.constants))) {
    const constant = recordOf(v);
    if (!nonEmpty(constant.reason)) out.push(`${at}: constant ${k} has no reason (a declared instance says why it is that one)`);
    if (constant.instance === undefined) out.push(`${at}: constant ${k} names no instance`);
    else if (c.count !== null && isWhole(constant.instance) && (constant.instance < 0 || constant.instance > c.count)) out.push(`${at}: constant ${k} is instance ${constant.instance}, outside the ${c.count}`);
  }
  if (row.words !== undefined && !Array.isArray(row.words)) out.push(`${at}: words must be a list`);
  if (row.arrays !== undefined && !Array.isArray(row.arrays)) out.push(`${at}: arrays must be a list`);
  if (row.names !== undefined && !(Array.isArray(row.names) && row.names.every(nonEmpty))) out.push(`${at}: names must be a list of identity names (strings)`);
  return out;
}

/** The rows that break the contract, as lines for doctor to print. */
export function validateShape(shape: LoadedShape | null): string[] {
  if (!shape) return [`no ${SHAPE_FILE}`];
  if (shape.error) return [shape.error];
  const out: string[] = [];
  const j = recordOf(shape.json);
  if (!isRecord(j.concepts)) out.push(`${SHAPE_FILE}: "concepts" must be an object`);
  if (!Array.isArray(j.exclude)) out.push(`${SHAPE_FILE}: "exclude" must be a list of globs`);
  if (j.values !== undefined && !(Array.isArray(j.values) && j.values.every(nonEmpty))) out.push(`${SHAPE_FILE}: "values" must be a list of type names (strings)`);
  for (const c of Object.values(shape.concepts)) out.push(...conceptProblems(c));
  return out;
}
