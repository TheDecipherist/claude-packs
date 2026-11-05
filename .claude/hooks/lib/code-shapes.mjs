// Repeated code, read statement by statement (0.24.0; measured on Stellix, where one line holds many statements and the copies are helpers,
// gate readers and hand-written tables, not whole classes). Names, numbers and strings are stripped, so a copy with other names reads the same:
//   setup   one object configured statement by statement: the members set on it, in order
//   run     a run of statements with one shape: a copy of code, whole or in part, wherever it sits
//   rows    one call repeated with other arguments: a table written as code
// Data rows, includes, imports and macros are no statements here: a table is already what the law asks for.
//   statementsOf(text, lang) -> [{ tokens, shape, line, end }]     codeShapes(text, ext) -> [{ id, kind, line, end, what, nodes }]
//   parametersOf(id, a, b, ext) -> what differs between two copies: the parameters of the one template.
import { createHash } from 'node:crypto';
import { languageOf } from './languages.mjs';

const TOKEN = /"\s*"|'\s*'|->|::|[A-Za-z_]\w*|\d[\w.']*|\S/g;
const TEXT_BLOCK = /`(?:\\[\s\S]|[^`\\])*`/g;   // a JS template string is text: CSS or HTML, read by the markup reader
const KEYWORDS = new Set(`if else for while do switch case default break continue return const constexpr static inline auto void int float double bool char
  unsigned long short struct class enum namespace template typename public private protected virtual override final new delete this true false nullptr
  sizeof noexcept function let var async await export of in def elif pass yield lambda with as try except finally raise not and or None True False self
  func fn impl pub mut match loop then end elsif unless local nil fi done esac`.split(/\s+/));
const MIN_STATEMENTS = 4;   // with the language's minTokens, about four lines of code: below this, unrelated code has one shape by chance
const MIN_ROWS = 6;

const isName = (t) => /^[A-Za-z_]/.test(t) && !KEYWORDS.has(t);
const stripped = (t) => (KEYWORDS.has(t) ? t : /^[A-Za-z_]/.test(t) ? 'i' : /^\d/.test(t) ? 'n' : /^["']/.test(t) && t.length > 1 ? 's' : t);
// A shell line is a command: the command and its flags are its shape, its arguments are what differs.
const strippedWord = (t, i) => (i === 0 || t.length === 1 || KEYWORDS.has(t) || /^-/.test(t) ? t : /=/.test(t) ? 'k=v' : 'w');
const shapeOf = (words, lang) => (lang.commands ? words.map(strippedWord) : words.map(stripped)).join(' ');
const CONTINUES = /^(?:\\|,|\+|&|\||\.|\(|\[|=)$/;
const hashOf = (s) => createHash('sha1').update(s).digest('hex').slice(0, 16);
const lineAt = (starts, offset) => { let lo = 0; let hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= offset) lo = mid; else hi = mid - 1; } return lo + 1; };

// Every statement that does something: it calls or assigns, or in shell runs a command. A row of a table does neither.
export function statementsOf(text, lang) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  const code = lang.blank(text).replace(lang.notCode ?? /^$^/gm, blank).replace(TEXT_BLOCK, blank);
  const starts = [0];
  for (let i = code.indexOf('\n'); i !== -1; i = code.indexOf('\n', i + 1)) starts.push(i + 1);
  const out = [];
  let tokens = [];
  let depth = 0;
  const close = () => {
    const words = tokens.map((t) => t.t);
    const isCode = lang.commands ? words.length >= 2 : words.some((t) => t === '(' || t === '=');
    if (tokens.length >= (lang.commands ? 2 : 3) && words.some(isName) && isCode) {
      // its line is where its first word is: the `),` a lambda's call leaves behind is the end of the last line, not this statement's start (KF-27)
      const first = tokens.find((t) => /^[A-Za-z_\d"'*&]/.test(t.t)) ?? tokens[0];
      out.push({ tokens, shape: shapeOf(words, lang), line: lineAt(starts, first.at), end: lineAt(starts, tokens.at(-1).at) });
    }
    tokens = [];
  };
  let last = 0;
  for (const m of code.matchAll(lang.token ?? TOKEN)) {
    const t = m[0];
    if (lang.lines && depth === 0 && tokens.length && code.slice(last, m.index).includes('\n') && !CONTINUES.test(tokens.at(-1).t) && t !== '.') close();
    tokens.push({ t, at: m.index, to: m.index + t.length });
    last = m.index + t.length;
    const dataBrace = lang.braces === false && (t === '{' || t === '}'); // a Python set or dict is one value, not a block (KF-14)
    if (t === '(' || t === '[' || (dataBrace && t === '{')) depth += 1;
    else if (t === ')' || t === ']' || (dataBrace && t === '}')) depth = Math.max(depth - 1, 0);
    if ((t === ';' && depth === 0) || (!dataBrace && (t === '{' || t === '}'))) close();
  }
  close();
  return out;
}

// Runs of statements on one receiver: `cutoff.setRange (...); cutoff.setValue (...); addAndMakeVisible (cutoff);`
function setupShapes(list, lang) {
  const out = [];
  let run = null;
  const flush = () => {
    if (run && new Set(run.members).size >= 2) out.push({ id: `o:${lang.name}:${run.members.join(',')}`, kind: 'setup', line: run.line, end: run.end, what: run.name, nodes: run.members.length });
    run = null;
  };
  for (const s of list) {
    const [a, dot, b, c, d] = s.tokens.map((t) => t.t);
    const on = (dot === '.' || dot === '->') && isName(a) && isName(b);
    const passed = run && dot === '(' && (b === run.name || (b === '&' && c === run.name)) && (d === ')' || c === ')');
    if (on && run?.name === a) { run.members.push(b); run.end = s.end; }
    else if (passed) { run.members.push(`${a}()`); run.end = s.end; }
    else { flush(); if (on) run = { name: a, members: [b], line: s.line, end: s.end }; }
  }
  flush();
  return out;
}

// The window that starts at i: enough statements and tokens to be code, not chance; null when the rest of the file is too short.
function windowAt(list, i, lang) {
  let tokens = 0;
  for (let j = i; j < list.length; j += 1) {
    tokens += list[j].tokens.length;
    if (tokens >= lang.minTokens && j - i + 1 >= MIN_STATEMENTS) return list.slice(i, j + 1);
  }
  return null;
}

function runShapes(list, lang) {
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const w = windowAt(list, i, lang);
    if (!w) break;
    if (new Set(w.map((s) => s.shape)).size * 2 < w.length) continue;   // one statement again and again is rows, not a run
    out.push({ id: `r:${hashOf(`${lang.name} ${w.map((s) => s.shape).join(' ')}`)}`, kind: 'run', line: w[0].line, end: w.at(-1).end, at: i, what: 'this code', nodes: w.length });
  }
  return out;
}

// One function called again and again on other arguments, in a row.
function rowShapes(list, lang) {
  const out = [];
  const callee = (s) => ((lang.commands || s.tokens[1]?.t === '(') && isName(s.tokens[0].t) ? `${s.tokens[0].t} ${s.shape}` : null);
  for (let i = 0; i < list.length;) {
    const key = callee(list[i]);
    let j = i + 1;
    while (key && j < list.length && callee(list[j]) === key) j += 1;
    if (j - i >= MIN_ROWS) out.push({ id: `t:${j - i}:${key}`, kind: 'rows', line: list[i].line, end: list[j - 1].end, what: `${list[i].tokens[0].t} (...)`, nodes: j - i });
    i = j;
  }
  return out;
}

export function codeShapes(text, ext) {
  const lang = languageOf(ext);
  if (!lang) return [];
  const list = statementsOf(text, lang);
  return [...setupShapes(list, lang), ...runShapes(list, lang), ...rowShapes(list, lang)];
}

function windowOf(id, text, lang) {
  const list = statementsOf(text, lang);
  const at = runShapes(list, lang).find((s) => s.id === id)?.at;
  return at === undefined ? [] : windowAt(list, at, lang);
}

// What differs between two copies of one run, as written: those are the template's parameters. None: the copy moves as it is.
export function parametersOf(id, textA, textB, ext) {
  const lang = languageOf(ext);
  const flat = (text) => windowOf(id, text, lang).flatMap((s) => s.tokens.map((t) => text.slice(t.at, t.to)));
  const a = flat(textA);
  const b = flat(textB);
  const pairs = a.map((t, i) => [t, b[i]]).filter(([x, y]) => x !== y && y !== undefined).map(([x, y]) => `${x} / ${y}`);
  return [...new Set(pairs)];
}
