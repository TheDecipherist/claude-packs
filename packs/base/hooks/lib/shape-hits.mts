// shape-hits: the instance literals one line holds for one concept (split out of shape.mts at its line limit).
//   lineHits(line, c, shape, aliases, inSwitch, file) -> [{ instance, why, call? }]
import { escapeRegExp } from './glob.mts';
import { blankMessages, isFirstMatch, isKnownName, isLibraryCall, isLongerName, isSourceRole, isSum } from './shape-prose.mts';
import type { ProseShape } from './shape-prose.mts';
import { conceptOfExpr, isCountish } from './shape-lines.mts';
import type { Aliases, ConceptsOf } from './shape-lines.mts';
import { parts } from './shape-model.mts';
import type { ShapeConceptData } from './shape-model.mts';

/** One instance a line names, why that is a literal, and the called function when it is a call. */
export interface LineHit { instance: string; why: string; call?: string }
type HitShape = ConceptsOf & ProseShape;
type Add = (instance: string | number, why: string, call?: string) => void;

const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);
const ORDINALS: readonly string[] = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const NOT_ROLES: ReadonlySet<string> = new Set([
  'ALL', 'EACH', 'EVERY', 'ANY', 'ONE', 'NEW', 'THE', 'NO', 'THIS', 'THAT', 'SAME', 'OTHER', 'OWN', 'NEXT', 'MANY', 'NOT', 'AND', 'OR',
  'TODO', 'NOTE', 'FIXME', 'IN', 'ON', 'OF', 'TO', 'A', 'AN', 'EMPTY', 'SELECTED', 'OPEN', 'CURRENT',
  // a gate's verdict before the word ("FAIL slot 2"; KWB-15)
  'PASS', 'FAIL', 'FAILED', 'RED', 'GREEN', 'OK', 'SKIP', 'WARN', 'ERROR',
  // a hardware part before the word: "the CPU part" is a chip, not one of the product's parts (KWB-next, supernova2); a domain chip
  // word is the project's known name in design/shape.json
  'CPU', 'MCU', 'ROM', 'RAM', 'EPROM', 'LCD', 'LED', 'PCB', 'IC', 'ASIC', 'FPGA', 'DAC', 'ADC',
]);
// A number followed by a counted noun is a count ("slot 3 printed pages of 6"; KWB-next, supernova2).
/** A quantifier right before the concept word: what follows is said of every instance, not of one. */
const QUANTIFIED = /(?<![A-Za-z])(?:every|each|all|any|no)\s+$/i;
const COUNTED = /^\s+(?:[a-z]+\s+)?(?:pages|rows|items|entries|lines|words|controls|parameters|params|values|steps|bytes|columns|characters|bits)\b/i;
// A named constant (a macro in capitals, a kName) is a quantity whose name carries the word, never a variable holding one instance:
// "SN2_SLOT_FILL != 0", "kStepsPerSlotStep" (KWB-next, supernova2 KF-11)
const isConstantName = (expr: string): boolean => { const last = expr.split(/\.|->|::/).at(-1) ?? ''; return /^[A-Z][A-Z0-9]*_[A-Z0-9_]+$/.test(last) || /^k[A-Z0-9]\w*$/.test(last); };
const EXPR = '[A-Za-z_]\\w*(?:(?:\\.|->|::)[A-Za-z_]\\w*|\\(\\)|\\[\\w*\\])*';

// A multi-word all-caps label ("AIM EFFECTS", "NOTES MONO") names a control, not an instance (KWB-22): the caps word before it.
const labelBefore = (line: string, at: number): boolean => { const w = /([A-Z][A-Z0-9]+)\s+$/.exec(line.slice(0, at)); return w !== null && !NOT_ROLES.has(w[1] ?? ''); };

// Each concept's expressions, built once: building them per line and per concept cost 1.3 s on a 17,000-line JSON, and a hook judges
// a write's text before and after (supernova2_monitor, brief-guard 4,953 ms on one cp, KWB-next). matchAll copies a regex before
// it runs, so one shared object holds no state between lines.
interface ConceptRegs { num: RegExp; camel: RegExp; ord: RegExp; role: RegExp }
const REGS = new WeakMap<ShapeConceptData, ConceptRegs>();
function regsOf(c: ShapeConceptData): ConceptRegs {
  const kept = REGS.get(c);
  if (kept) return kept;
  const W = c.words.map(escapeRegExp).sort((a, b) => b.length - a.length).join('|');
  const S = c.single.map(escapeRegExp).join('|');
  const roleWords = c.single.flatMap((w) => [escapeRegExp(w), escapeRegExp(cap(w))]).join('|');
  const made: ConceptRegs = {
    num: new RegExp(`(?<![A-Za-z0-9])(${W})(?:[ _#-]|\\s+(?:no\\.?|number|#)\\s*)?(\\d+)(?![\\dxX])((?:\\s*(?:-|–|\\.\\.|to|through)\\s*)(\\d+))?`, 'gi'), // 0x18000 is an address (KF-13)
    camel: new RegExp(`(?<=[a-z0-9_])(${c.words.map((w) => escapeRegExp(cap(w))).join('|')})_?(\\d+)(?!\\d)`, 'g'),
    ord: new RegExp(`(?<![A-Za-z0-9])(${ORDINALS.join('|')}|\\d+(?:st|nd|rd|th))[\\s_-]*(${S})(?![a-z])`, 'gi'),
    role: new RegExp(`(?<![A-Za-z0-9_])([A-Z][A-Z0-9]+)\\s+(${roleWords})(?![A-Za-z0-9_])`, 'g'),
  };
  REGS.set(c, made);
  return made;
}
const COMPARE_RIGHT = new RegExp(`(${EXPR})\\s*(?:===?|!==?)\\s*(\\d+)(?![\\w.])`, 'g');
const COMPARE_LEFT = new RegExp(`(?<![\\w.])(\\d+)\\s*(?:===?|!==?)\\s*(${EXPR})`, 'g');

// "slot 2", "slot #2", "slot2", "slots 1-3": a number after the concept's word.
function byNumber(line: string, words: string, c: ShapeConceptData, add: Add): void {
  const { num, camel } = regsOf(c);
  for (const m of words.matchAll(num)) {
    const [whole = '', word = '', first = '', range, last = ''] = m;
    if (isSourceRole(line, m)) continue; // KF-28
    // past the count: a value, not an instance (KWB-22); a range that starts past it is a set of values ("LFO 16-19", CC numbers in
    // supernova2_monitor's ledger, WB-18)
    if (c.count !== null && Number(first) > c.count) continue;
    if (word === word.toUpperCase() && labelBefore(line, m.index)) continue; // AIM EFFECTS 100: a control's value
    // "rows 48" in prose: the plural with one number is a count (KWB-next); a caps label ("SLOTS 2") still names one (KWB-22)
    if (word !== word.toUpperCase() && c.plural.has(word.toLowerCase()) && !range) continue;
    if (COUNTED.test(words.slice((m.index ?? 0) + whole.length))) continue; // "3 printed pages": a count of something else
    // "every program 0": a value every instance holds, said of all of them, names none (supernova2_monitor WB-167)
    if (QUANTIFIED.test(words.slice(0, m.index ?? 0))) continue;
    if (range && c.count !== null) {
      const [a, b] = [Number(first), Number(last)];
      if ((a === 0 && b === c.count - 1) || (a === 1 && b === c.count)) continue; // the whole range: every instance
    }
    add(first, `names it by number ("${whole.trim()}")`);
  }
  for (const m of line.matchAll(camel)) add(m[2] ?? '', `names it by number in an identifier ("${m[0]}")`);
}

/** Whether the word right after a concept word is another concept's word: the first then describes it, and names no instance. */
function describesAnother(after: string, c: ShapeConceptData, shape: HitShape): boolean {
  const next = /^\s+([A-Za-z]+)/.exec(after)?.[1]?.toLowerCase();
  if (next === undefined) return false;
  return Object.values(shape.concepts).some((o) => o.name !== c.name && o.words.some((w) => w.toLowerCase() === next));
}

/** A roman numeral, as a machine's name ends with one. */
const ROMAN = /^(?:I{1,3}|IV|VI{0,3}|IX|XI{0,3})$/;

// "the second slot", "3rd slot", and the role names ("the PAD slot").
function byName(line: string, words: string, c: ShapeConceptData, shape: HitShape, add: Add): void {
  const { ord, role } = regsOf(c);
  for (const m of words.matchAll(ord)) {
    if (isFirstMatch(words, m)) continue; // KF-17
    const o = (m[1] ?? '').toLowerCase();
    add(ORDINALS.includes(o) ? ORDINALS.indexOf(o) + 1 : parseInt(o, 10), `names it by ordinal ("${m[0].trim()}")`);
  }
  if (c.shape !== 'many') return;
  const notARole = (m: RegExpMatchArray): boolean => {
    const [whole = '', first = '', word = ''] = m;
    const at = m.index ?? 0;
    // a caps word holding a digit (CC9, OS2, F1) is a code or a number, never a role (supernova2_monitor WB-19)
    // a roman numeral ending a capitalised name ("Supernova II", "Jupiter VIII") is the name, not a role (supernova2_monitor WB-37)
    if (ROMAN.test(first) && /[A-Z][\w-]*\s+$/.test(words.slice(0, at))) return true;
    // the concept word describing the next noun, another concept's ("the ARC slot planet"), names no instance of it (KWB-next)
    if (describesAnother(words.slice(at + whole.length), c, shape)) return true;
    return /\d/.test(first) || NOT_ROLES.has(first) || c.words.includes(first.toLowerCase()) || c.names.has(first) || labelBefore(line, at) || isKnownName(first, word, shape) || isLongerName(words, at + whole.length);
  };
  for (const m of words.matchAll(role)) if (!notARole(m)) add(m[1] ?? '', `names it by a role ("${m[0]}"): the instance is a job or a value, not a ${c.name}`);
}

/** Each use pattern's matches in one line, found once and read by every concept: the patterns do not depend on the concept, and running them
 *  once per concept made byUse 40 % of shape-law on a new file (KWB-next: 13 ms for 155 lines at rest, 22 under a task's load). */
interface Uses { index: RegExpMatchArray[]; right: RegExpMatchArray[]; left: RegExpMatchArray[]; cases: RegExpMatchArray[]; calls: RegExpMatchArray[] }
const NO_USES: Uses = { index: [], right: [], left: [], cases: [], calls: [] };
let usesOf: { line: string; uses: Uses } | null = null;
function usesIn(line: string): Uses {
  if (!/\d/.test(line)) return NO_USES;   // every pattern names a number
  if (usesOf?.line !== line) {
    usesOf = { line, uses: {
      index: [...line.matchAll(/([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\]|\.at\(\s*(\d+)\s*\))/g)],
      right: [...line.matchAll(COMPARE_RIGHT)],
      left: [...line.matchAll(COMPARE_LEFT)],
      cases: [...line.matchAll(/\bcase\s+(\d+)\s*:/g)],
      calls: [...line.matchAll(/(?<![\w])([A-Za-z_]\w*)\s*\(\s*(\d+)\s*[,)]/g)],
    } };
  }
  return usesOf.uses;
}

// An array indexed by a number, a comparison with a number, a case, and a call that drives one instance by number.
function byUse(line: string, c: ShapeConceptData, shape: HitShape, aliases: Aliases, inSwitch: string | null, add: Add): void {
  const uses = usesIn(line);
  for (const m of uses.index) {
    const lead = line.slice(0, m.index).trimEnd();
    if (/[\w*&>]$/.test(lead) && !/(?:\b(?:return|case|else|do|in|of|throw|yield|await|and|or|not)|>>)$/.test(lead)) continue; // a declaration's size: Slot slots[4]
    const name = m[1] ?? '';
    const ps = parts(name);
    if (c.arrays.includes(name) || (ps.some((p) => c.words.includes(p)) && !ps.some(isCountish))) add(m[2] ?? m[3] ?? '', `indexes a per-${c.name} array with a number ("${m[0]}")`);
  }
  for (const m of uses.right) {
    if (isConstantName(m[1] ?? '') || isSum(line.slice(0, m.index))) continue; // a quantity, or an operand of a sum (KWB-next)
    if (conceptOfExpr(m[1] ?? '', shape, aliases) === c.name) add(m[2] ?? '', `compares a ${c.name} with a number ("${m[0]}")`);
  }
  for (const m of uses.left) {
    if (isConstantName(m[2] ?? '')) continue;
    if (conceptOfExpr(m[2] ?? '', shape, aliases) === c.name && !isSum(line.slice(0, m.index))) add(m[1] ?? '', `compares a ${c.name} with a number ("${m[0]}")`);
  }
  if (inSwitch === c.name) for (const m of uses.cases) add(m[1] ?? '', `a case for one ${c.name} ("${m[0]}")`);
  for (const m of uses.calls) {
    const fn = m[1] ?? '';
    const ps = parts(fn);
    if (isLibraryCall(line, m.index ?? 0, shape)) continue; // KF-20
    if (ps.some((p) => c.single.includes(p)) && !ps.some((p) => c.plural.has(p) || isCountish(p))) add(m[2] ?? '', `drives one ${c.name} by number ("${m[0].replace(/[,)]$/, '')}")`, fn);
  }
}

/** Whether the line holds one of the concept's singular words, in any case (the ordinal and role patterns' words). */
function mentions(line: string, c: ShapeConceptData): boolean {
  const lower = line.toLowerCase();
  return c.single.some((w) => lower.includes(w.toLowerCase()));
}

export function lineHits(line: string, c: ShapeConceptData, shape: HitShape, aliases: Aliases, inSwitch: string | null, file: string | null | undefined): LineHit[] {
  const hits: LineHit[] = [];
  const add: Add = (instance, why, call) => hits.push(call === undefined ? { instance: String(instance), why } : { instance: String(instance), why, call });
  const words = blankMessages(line, file); // what is read as words: a sentence in a string is text (KF-17)
  for (const re of c.patterns) for (const m of line.matchAll(re)) add(m[1] ?? m[0], `matches the pattern ${re.source}`);
  // a line with no digit can hit only by an ordinal or a role, and both need one of the concept's singular words: without one, nothing
  // here can hit (KWB-next: shape-law 15 ms at p50 on a new file's Write, every concept read on every line)
  if (!/\d/.test(line) && !mentions(line, c)) return hits;
  byNumber(line, words, c, add);
  byName(line, words, c, shape, add);
  byUse(line, c, shape, aliases, inSwitch, add);
  return hits;
}
