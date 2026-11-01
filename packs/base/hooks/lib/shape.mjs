// shape: the one reader of design/shape.json and the number rule (claude-packs 0.9.0; KWB-1: a hard-coded "slot 2" came
// from one spec sentence, spread through briefs and tests, and got past a check scoped to the engine folders).
// Everything in a synth is ONE (a fixed thing, reached by a frozen id) or MANY (N instances of one shape, reached only by
// a generator or a loop). A literal instance of a concept, anywhere, is allowed only as:
//   example   the line opens with "seen in:" or "example:" (after comment marks, a bullet or a table bar);
//   selector  the line uses a selector listed for the concept;
//   constant  the line uses a declared constant's name.
// Anything else is refused with "example, rule, or constant?". Every shape hook reads the manifest through this file.
//   readShape(root) -> shape | null            null: no design/shape.json; shape.error: it does not parse
//   validateShape(shape) -> [problem]          the rows that break the contract (doctor)
//   findInstanceLiterals(text, file, shape, { only }) -> [{ line, text, concept, instance, why }]
//     only: 'example' (just a seen in / example line excuses), 'brief' (that, or a declared constant read by name)
//   classify(line, concept, shape) -> 'example' | 'selector' | 'constant' | null
//   conceptOfType(name, shape) -> concept name | null
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matchesAny } from './glob.mjs';

export const SHAPE_FILE = 'design/shape.json';
export const ASK = 'example, rule, or constant?';
export const EMPTY_SHAPE = { concepts: {}, exclude: ['out/**', 'build/**', 'third_party/**', 'JUCE/**', 'node_modules/**'] };
const HINT = '(an example goes on a "seen in:" line; a rule is a selector in design/shape.json; a constant is a named row there)';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
// identifier -> lower-case parts: "kSlotNames" -> k slot names; "slot2Gain" -> slot 2 gain
export const parts = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  .replace(/([A-Za-z])(\d)/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const COUNTISH = new Set(['size', 'length', 'count', 'num', 'number', 'total', 'max', 'min', 'n', 'len', 'capacity']);
const INDEXISH = new Set(['index', 'idx', 'ix', 'id', 'no']);

function compile(name, row) {
  const words = (Array.isArray(row.words) && row.words.length ? row.words : [name, `${name}s`]).map((w) => String(w).toLowerCase());
  const plural = new Set(words.filter((w) => words.some((s) => s !== w && (w === `${s}s` || w === `${s}es`))));
  const single = words.filter((w) => !plural.has(w));
  const patterns = [];
  const bad = [];
  for (const p of row.patterns ?? []) { try { patterns.push(new RegExp(p, 'g')); } catch (e) { bad.push(`${p}: ${e.message}`); } }
  const generatorName = String(row.generator ?? '').match(/^\s*([A-Za-z_]\w*)\s*\(/)?.[1] ?? null;
  return {
    name, row, shape: row.shape, count: Number.isInteger(row.count) ? row.count : null, id: row.id ?? null,
    words, plural, single: single.length ? single : words, patterns, badPatterns: bad,
    arrays: Array.isArray(row.arrays) ? row.arrays : [], generatorName,
    selectors: Object.keys(row.selectors ?? {}), constants: Object.keys(row.constants ?? {}),
    // manifest prose (a constant's reason, a selector's description) quoted in a brief is never an instance literal
    quotes: [...Object.values(row.constants ?? {}).map((c) => c?.reason), ...Object.values(row.selectors ?? {})].filter((q) => typeof q === 'string' && q.length > 3),
  };
}

export function normaliseShape(json) {
  const concepts = {};
  const raw = json && typeof json.concepts === 'object' && !Array.isArray(json.concepts) ? json.concepts : {};
  for (const [name, row] of Object.entries(raw)) concepts[name] = compile(name, row ?? {});
  return { concepts, exclude: Array.isArray(json?.exclude) ? json.exclude : [], json };
}

export function readShape(root) {
  let text;
  try { text = readFileSync(join(root, SHAPE_FILE), 'utf8'); } catch { return null; }
  try { return normaliseShape(JSON.parse(text)); } catch (e) { return { concepts: {}, exclude: [], error: `${SHAPE_FILE} does not parse: ${e.message}` }; }
}

export function validateShape(shape) {
  if (!shape) return [`no ${SHAPE_FILE}`];
  if (shape.error) return [shape.error];
  const out = [];
  const j = shape.json ?? {};
  if (!j.concepts || typeof j.concepts !== 'object' || Array.isArray(j.concepts)) out.push(`${SHAPE_FILE}: "concepts" must be an object`);
  if (!Array.isArray(j.exclude)) out.push(`${SHAPE_FILE}: "exclude" must be a list of globs`);
  for (const c of Object.values(shape.concepts)) {
    const at = `${SHAPE_FILE} "${c.name}"`;
    if (c.shape !== 'one' && c.shape !== 'many') out.push(`${at}: shape must be "one" or "many" (is ${JSON.stringify(c.shape)})`);
    if (c.shape === 'many' && !(typeof c.row.generator === 'string' && c.row.generator.trim())) out.push(`${at}: a many concept needs its generator (the one way an instance's id is made, e.g. "${c.name}Id(i, field)")`);
    if (c.row.count !== undefined && !(Number.isInteger(c.row.count) && c.row.count > 0)) out.push(`${at}: count must be a whole number above 0`);
    if (c.shape === 'one' && c.row.count !== undefined) out.push(`${at}: a one concept has no count`);
    for (const b of c.badPatterns) out.push(`${at}: pattern does not compile: ${b}`);
    if (c.row.selectors !== undefined && (typeof c.row.selectors !== 'object' || Array.isArray(c.row.selectors))) out.push(`${at}: selectors must be { name: "what it picks" }`);
    for (const [k, v] of Object.entries(c.row.constants ?? {})) {
      if (!v || typeof v.reason !== 'string' || !v.reason.trim()) out.push(`${at}: constant ${k} has no reason (a declared instance says why it is that one)`);
      if (!v || v.instance === undefined) out.push(`${at}: constant ${k} names no instance`);
      else if (c.count !== null && Number.isInteger(v.instance) && (v.instance < 0 || v.instance > c.count)) out.push(`${at}: constant ${k} is instance ${v.instance}, outside the ${c.count}`);
    }
    if (c.row.words !== undefined && !Array.isArray(c.row.words)) out.push(`${at}: words must be a list`);
    if (c.row.arrays !== undefined && !Array.isArray(c.row.arrays)) out.push(`${at}: arrays must be a list`);
  }
  return out;
}

export const isExcluded = (rel, shape) => rel === SHAPE_FILE || matchesAny(rel, shape?.exclude ?? []);
export const isTestFile = (rel) => /(^|\/)(test|tests|probes)\//.test(rel) || /test|_probe/i.test(rel.split('/').pop());

// The line opens with "seen in:" or "example:", after comment marks, a bullet, a heading mark or a table bar.
const EXAMPLE = /^\s*(?:(?:[-*+>|]|\d+[.)]|\/\/+|\/\*+|#+|<!--|--|;+)\s*)*(?:seen in|example)\s*:/i;
const EXAMPLE_CELL = /^\s*\|.*\|\s*(?:seen in|example)\s*:/i;
export const isExampleLine = (line) => EXAMPLE.test(line) || EXAMPLE_CELL.test(line);

const named = (line, name) => new RegExp(`(?<![\\w])${esc(name)}(?![\\w])`).test(line);
export function classify(line, concept, shape) {
  const c = typeof concept === 'string' ? shape?.concepts?.[concept] : concept;
  if (isExampleLine(line)) return 'example';
  if (!c) return null;
  if (c.selectors.some((s) => named(line, s))) return 'selector';
  if (c.constants.some((s) => named(line, s))) return 'constant';
  return null;
}

// The concept an identifier names: a part equal to one of a concept's words.
export function conceptOfName(name, shape, { singleOnly = false } = {}) {
  const ps = parts(name);
  for (const c of Object.values(shape?.concepts ?? {})) if (ps.some((p) => (singleOnly ? c.single : c.words).includes(p))) return c.name;
  return null;
}
export const conceptOfType = (name, shape) => conceptOfName(name, shape);

// The concept an expression compares or indexes: its last member (or the one before an index-like member), when that names
// a concept in the singular and is not a count (slots.size(), numSlots).
function conceptOfExpr(expr, shape, aliases) {
  const segs = expr.split(/\.|->|::|\(\)|\[[^\]]*\]/).map((s) => s.trim()).filter(Boolean);
  if (!segs.length) return null;
  let last = segs.at(-1);
  if (aliases.has(last)) return aliases.get(last);
  if (INDEXISH.has(last.toLowerCase()) && segs.length > 1) last = segs.at(-2);
  const ps = parts(last);
  if (ps.some((p) => COUNTISH.has(p))) return null;
  for (const c of Object.values(shape.concepts)) {
    if (ps.some((p) => c.plural.has(p))) return null;
    if (ps.some((p) => c.single.includes(p))) return c.name;
  }
  return null;
}

// Loop variables bounded by a concept's count, and locals set from a concept-named expression, stand for that concept.
function aliasesOf(text, shape) {
  const out = new Map();
  const bound = (b) => { const ps = parts(b); for (const c of Object.values(shape.concepts)) if (ps.some((p) => c.words.includes(p))) return c.name; return null; };
  for (const m of text.matchAll(/for\s*\(\s*(?:[\w:<>]+\s+)?(\w+)\s*=\s*\d+\s*;\s*\1\s*<=?\s*([\w.:>()\-]+)/g)) { const c = bound(m[2]); if (c) out.set(m[1], c); }
  for (const m of text.matchAll(/for\s+(\w+)\s+in\s+range\(([^)]*)\)/g)) { const c = bound(m[2]); if (c) out.set(m[1], c); }
  for (const m of text.matchAll(/\b(?:int|auto|size_t|std::size_t|unsigned|uint\w*|int\w*_t|let|const|var)\s+(\w+)\s*=\s*([A-Za-z_][\w.:>\-]*(?:\(\))?)\s*;/g)) {
    const c = conceptOfExpr(m[2], shape, new Map());
    if (c) out.set(m[1], c);
  }
  return out;
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const NOT_ROLES = new Set(['ALL', 'EACH', 'EVERY', 'ANY', 'ONE', 'NEW', 'THE', 'NO', 'THIS', 'THAT', 'SAME', 'OTHER', 'OWN', 'NEXT', 'MANY', 'NOT', 'AND', 'OR', 'TODO', 'NOTE', 'FIXME', 'IN', 'ON', 'OF', 'TO', 'A', 'AN', 'EMPTY', 'SELECTED', 'OPEN', 'CURRENT']);

function lineHits(line, c, shape, aliases, inSwitch) {
  const hits = [];
  const add = (instance, why) => hits.push({ instance: String(instance), why });
  for (const re of c.patterns) for (const m of line.matchAll(re)) add(m[1] ?? m[0], `matches the pattern ${re.source}`);
  const W = c.words.map(esc).sort((a, b) => b.length - a.length).join('|');
  const num = new RegExp(`(?<![A-Za-z0-9])(${W})(?:[ _#-]|\\s+(?:no\\.?|number|#)\\s*)?(\\d+)(?!\\d)((?:\\s*(?:-|–|\\.\\.|to|through)\\s*)(\\d+))?`, 'gi');
  for (const m of line.matchAll(num)) {
    if (m[3] && c.count !== null) {
      const [a, b] = [Number(m[2]), Number(m[4])];
      if ((a === 0 && b === c.count - 1) || (a === 1 && b === c.count)) continue; // the whole range: every instance
    }
    add(m[2], `names it by number ("${m[0].trim()}")`);
  }
  const camel = new RegExp(`(?<=[a-z0-9_])(${c.words.map((w) => esc(cap(w))).join('|')})_?(\\d+)(?!\\d)`, 'g');
  for (const m of line.matchAll(camel)) add(m[2], `names it by number in an identifier ("${m[0]}")`);
  const S = c.single.map(esc).join('|');
  const ord = new RegExp(`(?<![A-Za-z0-9])(${ORDINALS.join('|')}|\\d+(?:st|nd|rd|th))[\\s_-]*(${S})(?![a-z])`, 'gi');
  for (const m of line.matchAll(ord)) {
    const o = m[1].toLowerCase();
    add(ORDINALS.includes(o) ? ORDINALS.indexOf(o) + 1 : parseInt(o, 10), `names it by ordinal ("${m[0].trim()}")`);
  }
  if (c.shape === 'many') {
    const role = new RegExp(`(?<![A-Za-z0-9_])([A-Z][A-Z0-9]+)\\s+(${c.single.flatMap((w) => [esc(w), esc(cap(w))]).join('|')})(?![A-Za-z0-9_])`, 'g');
    for (const m of line.matchAll(role)) if (!NOT_ROLES.has(m[1]) && !c.words.includes(m[1].toLowerCase())) add(m[1], `names it by a role ("${m[0]}"): the instance is a sound or a job, not a ${c.name}`);
  }
  for (const m of line.matchAll(/([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\]|\.at\(\s*(\d+)\s*\))/g)) {
    const lead = line.slice(0, m.index).trimEnd();
    if (/[\w*&>]$/.test(lead) && !/(?:\b(?:return|case|else|do|in|of|throw|yield|await|and|or|not)|>>)$/.test(lead)) continue; // a declaration's size: Slot slots[4]
    const listed = c.arrays.includes(m[1]);
    const ps = parts(m[1]);
    if (listed || (ps.some((p) => c.words.includes(p)) && !ps.some((p) => COUNTISH.has(p)))) add(m[2] ?? m[3], `indexes a per-${c.name} array with a number ("${m[0]}")`);
  }
  const EXPR = '[A-Za-z_]\\w*(?:(?:\\.|->|::)[A-Za-z_]\\w*|\\(\\)|\\[\\w*\\])*';
  for (const m of line.matchAll(new RegExp(`(${EXPR})\\s*(?:===?|!==?)\\s*(\\d+)(?![\\w.])`, 'g'))) if (conceptOfExpr(m[1], shape, aliases) === c.name) add(m[2], `compares a ${c.name} with a number ("${m[0]}")`);
  for (const m of line.matchAll(new RegExp(`(?<![\\w.])(\\d+)\\s*(?:===?|!==?)\\s*(${EXPR})`, 'g'))) if (conceptOfExpr(m[2], shape, aliases) === c.name) add(m[1], `compares a ${c.name} with a number ("${m[0]}")`);
  if (inSwitch === c.name) for (const m of line.matchAll(/\bcase\s+(\d+)\s*:/g)) add(m[1], `a case for one ${c.name} ("${m[0]}")`);
  for (const m of line.matchAll(/(?<![\w])([A-Za-z_]\w*)\s*\(\s*(\d+)\s*[,)]/g)) {
    const ps = parts(m[1]);
    if (ps.some((p) => c.single.includes(p)) && !ps.some((p) => c.plural.has(p) || COUNTISH.has(p))) add(m[2], `drives one ${c.name} by number ("${m[0].replace(/[,)]$/, '')}")`);
  }
  return hits;
}

// Consecutive lines (or ;/, separated pieces of one line) that differ only in one number running over every instance:
// a hand-listed set, one line per instance.
function handLists(lines, c, out, seen) {
  if (!c.count || c.count < 2 || c.shape !== 'many') return;
  const mentions = (t) => parts(t).some((p) => c.words.includes(p)) || c.arrays.some((a) => named(t, a));
  const templates = (t) => [...t.matchAll(/(?<![\w.])\d+(?![\w.])/g)].map((m) => ({ tpl: t.slice(0, m.index) + '#' + t.slice(m.index + m[0].length), v: Number(m[0]) }));
  const runOver = (pieces, at, whole = null) => {
    for (let i = 0; i + c.count <= pieces.length; i += 1) {
      for (const first of templates(pieces[i].trim())) {
        if (first.v > 1 || !mentions(whole ?? first.tpl)) continue;
        let ok = true;
        for (let k = 1; k < c.count && ok; k += 1) ok = templates(pieces[i + k].trim()).some((t) => t.tpl === first.tpl && t.v === first.v + k);
        if (ok) return at(i);
      }
    }
    return null;
  };
  const lineNo = runOver(lines, (i) => i);
  if (lineNo !== null && !isExampleLine(lines[lineNo]) && !seen.has(`${lineNo}|${c.name}`)) {
    out.push({ line: lineNo + 1, text: lines[lineNo].trim(), concept: c.name, instance: 'each', why: `a hand-listed set, one line per ${c.name}: write one loop over every ${c.name}, or the generator` });
  }
  lines.forEach((l, i) => {
    if (seen.has(`${i}|${c.name}`) || isExampleLine(l) || classify(l, c, null)) return;
    const pieces = l.split(/[;,]/);
    if (pieces.length >= c.count && runOver(pieces, () => true, l)) out.push({ line: i + 1, text: l.trim(), concept: c.name, instance: 'each', why: `a hand-listed set, one piece per ${c.name}: write one loop over every ${c.name}, or the generator` });
  });
}

export function findInstanceLiterals(text, file, shape, { only = null } = {}) {
  if (!shape || !text) return [];
  const concepts = Object.values(shape.concepts).filter((c) => c.shape === 'many' || (c.shape === 'one' && c.id));
  let body = text;
  for (const c of concepts) for (const q of c.quotes) body = body.split(q).join(' '.repeat(q.length));
  const lines = body.split('\n');
  const shown = text.split('\n');
  const aliases = aliasesOf(body, shape);
  const out = [];
  const seen = new Set();
  let inSwitch = null;
  lines.forEach((line, i) => {
    const sw = line.match(/\bswitch\s*\(([^)]*)\)/);
    if (sw) inSwitch = conceptOfExpr(sw[1].trim(), shape, aliases);
    for (const c of concepts) {
      const cls = classify(line, c, shape);
      // only 'brief': an example or a declared constant read by name excuses it (the number rule's third form), a selector does not
      if (cls === 'example' || (cls === 'constant' && only === 'brief') || (cls && only !== 'example' && only !== 'brief')) continue;
      const once = new Set();
      for (const h of lineHits(line, c, shape, aliases, inSwitch)) {
        if (once.has(h.instance)) continue;
        once.add(h.instance);
        seen.add(`${i}|${c.name}`);
        out.push({ line: i + 1, text: shown[i].trim(), concept: c.name, instance: h.instance, why: h.why });
      }
    }
  });
  for (const c of concepts) handLists(lines, c, out, seen);
  return out.sort((a, b) => a.line - b.line);
}

// The findings an edit adds: those in the text after it, beyond the same findings already in the text before it.
export function addedFindings(before, after, find) {
  const had = new Map();
  for (const f of find(before ?? '')) { const k = `${f.concept}|${f.why}|${f.text}`; had.set(k, (had.get(k) ?? 0) + 1); }
  return find(after ?? '').filter((f) => { const k = `${f.concept}|${f.why}|${f.text}`; const n = had.get(k) ?? 0; if (n > 0) { had.set(k, n - 1); return false; } return true; });
}

export function formatFinding(f, file) {
  const tail = f.kind ? f.why : `names ${f.concept} instance ${f.instance} — ${ASK} ${HINT}\n      ${f.why}`;
  return `${file}:${f.line}: "${f.text.length > 140 ? `${f.text.slice(0, 137)}...` : f.text}" ${tail}`;
}

// The manifest row as one line, for a refusal or a brief to quote.
export function quoteRow(name, shape) {
  const c = shape?.concepts?.[name];
  return c ? `${SHAPE_FILE} "${name}": ${JSON.stringify(c.row)}` : `${SHAPE_FILE} has no row "${name}"`;
}

// One line per refused concept in .claude/usage.log: time, hook, concept (the shape hooks count what they refuse).
export function logRefusal(root, hook, concepts) {
  try {
    mkdirSync(join(root, '.claude'), { recursive: true });
    const t = new Date().toISOString();
    appendFileSync(join(root, '.claude', 'usage.log'), [...new Set(concepts)].map((c) => `${t}\t${hook}\t${c}\n`).join(''));
  } catch { /* the count is a report, never a reason to fail the hook */ }
}
