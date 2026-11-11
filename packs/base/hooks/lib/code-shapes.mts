// Repeated code, read statement by statement (0.24.0; measured on Stellix, where one line holds many statements and the copies are helpers,
// gate readers and hand-written tables, not whole classes). Names, numbers and strings are stripped, so a copy with other names reads the same:
//   setup   one object configured statement by statement: the members set on it, in order
//   run     a run of statements with one shape: a copy of code, whole or in part, wherever it sits
//   rows    one call repeated with other arguments: a table written as code
// Data rows, includes, imports and macros are no statements here: a table is already what the law asks for.
//   statementsOf(text, lang) -> [{ tokens, shape, line, end }]     codeShapes(text, ext) -> [{ id, kind, line, end, what, nodes }]
//   parametersOf(id, a, b, ext) -> what differs between two copies: the parameters of the one template.
import { shortHash } from './hash.mts';
import { languageOf } from './languages.mts';
import type { Language } from './languages.mts';

/** One token of a statement: its text and where it sits in the blanked source. */
export interface Token { t: string; at: number; to: number }
/** One statement that does something: its tokens, its shape (names and numbers stripped), and the lines it spans. */
export interface Statement { tokens: Token[]; shape: string; line: number; end: number }
/** One repeated stretch: a `setup`, a `run` or `rows`. A run also says where its window starts in the statement list (`at`). */
export interface CodeShape { id: string; kind: 'setup' | 'run' | 'rows'; line: number; end: number; at?: number; what: string; nodes: number }

const TOKEN = /"\s*"|'\s*'|->|::|[A-Za-z_]\w*|\d[\w.']*|\S/g;
const TEXT_BLOCK = /\x60(?:\\[\s\S]|[^\x60\\])*\x60/g;   // a JS template string is text: CSS or HTML, read by the markup reader
const KEYWORDS: ReadonlySet<string> = new Set(`if else for while do switch case default break continue return const constexpr static inline auto void int float double bool char
  unsigned long short struct class enum namespace template typename public private protected virtual override final new delete this true false nullptr
  sizeof noexcept function let var async await export of in def elif pass yield lambda with as try except finally raise not and or None True False self
  func fn impl pub mut match loop then end elsif unless local nil fi done esac`.split(/\s+/));
const MIN_STATEMENTS = 4;   // with the language's minTokens, about four lines of code: below this, unrelated code has one shape by chance
const MIN_ROWS = 6;

const isName = (t: string | undefined): boolean => t !== undefined && /^[A-Za-z_]/.test(t) && !KEYWORDS.has(t);
const stripped = (t: string): string => (KEYWORDS.has(t) ? t : /^[A-Za-z_]/.test(t) ? 'i' : /^\d/.test(t) ? 'n' : /^["']/.test(t) && t.length > 1 ? 's' : t);
// A shell line is a command: the command and its flags are its shape, its arguments are what differs.
const strippedWord = (t: string, i: number): string => (i === 0 || t.length === 1 || KEYWORDS.has(t) || /^-/.test(t) ? t : /=/.test(t) ? 'k=v' : 'w');
const shapeOf = (words: string[], lang: Language): string => (lang.commands ? words.map(strippedWord) : words.map(stripped)).join(' ');
const CONTINUES = /^(?:\\|,|\+|&|\||\.|\(|\[|=)$/;
const hashOf = (s: string): string => shortHash(s, 16);
const lineAt = (starts: readonly number[], offset: number): number => {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if ((starts[mid] ?? 0) <= offset) lo = mid; else hi = mid - 1; }
  return lo + 1;
};
const blank = (m: string): string => m.replace(/[^\n]/g, ' ');

/** Every statement that does something: it calls or assigns, or in shell runs a command. A row of a table does neither. */
export function statementsOf(text: string, lang: Language): Statement[] {
  const code = lang.blank(text).replace(lang.notCode ?? /^$^/gm, blank).replace(TEXT_BLOCK, blank);
  const starts = [0];
  for (let i = code.indexOf('\n'); i !== -1; i = code.indexOf('\n', i + 1)) starts.push(i + 1);
  const out: Statement[] = [];
  let tokens: Token[] = [];
  let depth = 0;
  const close = (): void => {
    const words = tokens.map((t) => t.t);
    const isCode = lang.commands ? words.length >= 2 : words.some((t) => t === '(' || t === '=');
    const first = tokens.find((t) => /^[A-Za-z_\d"'*&]/.test(t.t)) ?? tokens[0];   // its line is where its first word is: the `),` a lambda's call leaves behind is the end of the last line, not this statement's start (KF-27)
    const lastToken = tokens.at(-1);
    if (first && lastToken && tokens.length >= (lang.commands ? 2 : 3) && words.some(isName) && isCode) {
      out.push({ tokens, shape: shapeOf(words, lang), line: lineAt(starts, first.at), end: lineAt(starts, lastToken.at) });
    }
    tokens = [];
  };
  let last = 0;
  for (const m of code.matchAll(lang.token ?? TOKEN)) {
    const t = m[0];
    const at = m.index ?? 0;
    const prev = tokens.at(-1);
    if (lang.lines && depth === 0 && prev && code.slice(last, at).includes('\n') && !CONTINUES.test(prev.t) && t !== '.') close();
    tokens.push({ t, at, to: at + t.length });
    last = at + t.length;
    const dataBrace = lang.braces === false && (t === '{' || t === '}'); // a Python set or dict is one value, not a block (KF-14)
    if (t === '(' || t === '[' || (dataBrace && t === '{')) depth += 1;
    else if (t === ')' || t === ']' || (dataBrace && t === '}')) depth = Math.max(depth - 1, 0);
    if ((t === ';' && depth === 0) || (!dataBrace && (t === '{' || t === '}'))) close();
  }
  close();
  return out;
}

interface SetupRun { name: string; members: string[]; line: number; end: number }

// Runs of statements on one receiver: `cutoff.setRange (...); cutoff.setValue (...); addAndMakeVisible (cutoff);`
function setupShapes(list: readonly Statement[], lang: Language): CodeShape[] {
  const out: CodeShape[] = [];
  const state: { run: SetupRun | null } = { run: null };
  const flush = (): void => {
    const run = state.run;
    if (run && new Set(run.members).size >= 2) out.push({ id: `o:${lang.name}:${run.members.join(',')}`, kind: 'setup', line: run.line, end: run.end, what: run.name, nodes: run.members.length });
    state.run = null;
  };
  for (const s of list) {
    const [a, dot, b, c, d] = s.tokens.map((t) => t.t);
    const on = (dot === '.' || dot === '->') && isName(a) && isName(b);
    const open = state.run;
    const passed = open !== null && dot === '(' && (b === open.name || (b === '&' && c === open.name)) && (d === ')' || c === ')');
    if (open && on && open.name === a && b !== undefined) { open.members.push(b); open.end = s.end; }
    else if (open && passed) { open.members.push(`${a}()`); open.end = s.end; }
    else { flush(); if (on && a !== undefined && b !== undefined) state.run = { name: a, members: [b], line: s.line, end: s.end }; }
  }
  flush();
  return out;
}

// The window that starts at i: enough statements and tokens to be code, not chance; null when the rest of the file is too short.
function windowAt(list: readonly Statement[], i: number, lang: Language): Statement[] | null {
  let tokens = 0;
  for (let j = i; j < list.length; j += 1) {
    tokens += list[j]?.tokens.length ?? 0;
    if (tokens >= lang.minTokens && j - i + 1 >= MIN_STATEMENTS) return list.slice(i, j + 1);
  }
  return null;
}

function runShapes(list: readonly Statement[], lang: Language): CodeShape[] {
  const out: CodeShape[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const w = windowAt(list, i, lang);
    const first = w?.[0];
    const last = w?.at(-1);
    if (!w || !first || !last) break;
    if (new Set(w.map((s) => s.shape)).size * 2 < w.length) continue;   // one statement again and again is rows, not a run
    out.push({ id: `r:${hashOf(`${lang.name} ${w.map((s) => s.shape).join(' ')}`)}`, kind: 'run', line: first.line, end: last.end, at: i, what: 'this code', nodes: w.length });
  }
  return out;
}

// One function called again and again on other arguments, in a row.
function rowShapes(list: readonly Statement[], lang: Language): CodeShape[] {
  const out: CodeShape[] = [];
  // A language whose calls are methods says so: `app.route (...)` six times is a table too, on one receiver.
  const method = (s: Statement): boolean => Boolean(lang.methodRows) && ['.', '::'].includes(s.tokens[1]?.t ?? '') && s.tokens[3]?.t === '(' && isName(s.tokens[2]?.t);
  const callee = (s: Statement): string | null => ((lang.commands || s.tokens[1]?.t === '(' || method(s)) && isName(s.tokens[0]?.t) ? `${s.tokens.slice(0, method(s) ? 3 : 1).map((t) => t.t).join('')} ${s.shape}` : null);
  for (let i = 0; i < list.length;) {
    const head = list[i];
    const key = head ? callee(head) : null;
    let j = i + 1;
    while (key && j < list.length && callee(list[j] as Statement) === key) j += 1;
    const tail = list[j - 1];
    if (head && tail && key && j - i >= MIN_ROWS) out.push({ id: `t:${j - i}:${key}`, kind: 'rows', line: head.line, end: tail.end, what: `${key.split(' ')[0]} (...)`, nodes: j - i });
    i = j;
  }
  return out;
}

/** Every repeated stretch of the text, in the language of its extension; none for a language the table does not read. */
export function codeShapes(text: string, ext: string): CodeShape[] {
  const lang = languageOf(ext);
  if (!lang) return [];
  const list = statementsOf(text, lang);
  return [...setupShapes(list, lang), ...runShapes(list, lang), ...rowShapes(list, lang)];
}

function windowOf(id: string, text: string, lang: Language): Statement[] {
  const list = statementsOf(text, lang);
  const at = runShapes(list, lang).find((s) => s.id === id)?.at;
  return at === undefined ? [] : windowAt(list, at, lang) ?? [];
}

/** What differs between two copies of one run, as written: those are the template's parameters. None: the copy moves as it is. */
export function parametersOf(id: string, textA: string, textB: string, ext: string): string[] {
  const lang = languageOf(ext);
  if (!lang) return [];
  const flat = (text: string): string[] => windowOf(id, text, lang).flatMap((s) => s.tokens.map((t) => text.slice(t.at, t.to)));
  const a = flat(textA);
  const b = flat(textB);
  const pairs: string[] = [];
  a.forEach((x, i) => { const y = b[i]; if (y !== undefined && x !== y) pairs.push(`${x} / ${y}`); });
  return [...new Set(pairs)];
}
