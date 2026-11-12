// Every named function in a text, with how much it holds (0.25.0). A line limit cannot see a 140-statement function written 70 lines long, or a
// function that takes nine positional arguments.
//   functionsOf(text, ext) -> [{ name, line, end, statements, params }]
import { statementsOf } from './code-shapes.mts';
import { languageOf } from './languages.mts';

/** One function found in a text: where it starts and ends (1-based lines), how many statements it holds and how many parameters it takes. */
export interface FunctionShape {
  name: string;
  line: number;
  end: number;
  statements: number;
  params: number;
}

/** A function before its offsets are turned into lines. */
interface Found {
  name: string;
  from: number;
  to: number;
  params: number;
}

interface Head {
  name: string;
  open: number;
  params: number;
}

const CONTROL: ReadonlySet<string> = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'sizeof', 'function', 'with', 'elif', 'do', 'foreach', 'until', 'unless']);
const BY_INDENT: ReadonlySet<string> = new Set(['python', 'ruby', 'lua']);

// Index of the bracket that opens the one closing at `close`, or -1.
function openerOf(code: string, close: number): number {
  let depth = 0;
  for (let i = close; i >= 0; i -= 1) {
    if (code[i] === ')') depth += 1;
    else if (code[i] === '(' && (depth -= 1) === 0) return i;
  }
  return -1;
}

function paramsIn(inner: string): number {
  let depth = 0;
  let commas = 0;
  for (const c of inner) {
    if ('(<[{'.includes(c)) depth += 1;
    else if (')>]}'.includes(c)) depth -= 1;
    else if (c === ',' && depth === 0) commas += 1;
  }
  const self = /^\s*(?:self|cls|&?(?:mut\s+)?self)\s*(?:,|$)/.test(inner) ? 1 : 0;
  return inner.trim() ? commas + 1 - self : 0;
}

// `name (params) ... {`: the head before a body's brace, or null when it is a block, a call or a type.
function headOf(code: string, brace: number): Head | null {
  const head = code.slice(Math.max(0, brace - 400), brace);
  const close = head.search(/\)(?:\s*(?:const|noexcept|override|final|mutable|throws\s+[\w, ]+|->\s*[^{;]+|=>|:\s*[\w<>[\]., |?]+))*\s*$/);
  if (close < 0) return null;
  const at = brace - head.length + close;
  const open = openerOf(code, at);
  if (open < 0) return null;
  const arrow = code.slice(0, open).match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?$/);
  const name = arrow?.[1] ?? code.slice(Math.max(0, open - 80), open).match(/([A-Za-z_$][\w$]*)\s*(?:<[^<>()]*>)?\s*$/)?.[1];
  return !name || CONTROL.has(name) ? null : { name, open, params: paramsIn(code.slice(open + 1, at)) };
}

function byBraces(code: string): Found[] {
  const out: Found[] = [];
  const stack: number[] = [];
  for (let i = 0; i < code.length; i += 1) {
    if (code[i] === '{') stack.push(i);
    else if (code[i] === '}' && stack.length) {
      const a = stack.pop() ?? 0;
      const head = headOf(code, a);
      if (head) out.push({ name: head.name, params: head.params, from: a, to: i });
    }
  }
  return out;
}

function byIndent(code: string, starts: readonly number[]): Found[] {
  const lines = code.split('\n');
  const out: Found[] = [];
  lines.forEach((l, i) => {
    const m = l.match(/^(\s*)(?:async\s+)?(?:local\s+)?(?:def|function)\s+([A-Za-z_][\w.:?!]*)\s*(?:\(([^)]*)\)?)?/);
    if (!m) return;
    const indent = (m[1] ?? '').length;
    let end = i;
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j] ?? '';
      if (!next.trim()) continue;
      if ((next.match(/^\s*/)?.[0] ?? '').length <= indent) break;
      end = j;
    }
    out.push({ name: m[2] ?? '', from: starts[i] ?? 0, to: starts[end] ?? 0, params: paramsIn(m[3] ?? '') });
  });
  return out;
}

export function functionsOf(text: string, ext: string): FunctionShape[] {
  const lang = languageOf(ext);
  if (!lang) return [];
  const code = lang.blank(text);
  const starts = [0];
  for (let i = code.indexOf('\n'); i !== -1; i = code.indexOf('\n', i + 1)) starts.push(i + 1);
  const lineOf = (offset: number): number => { let n = 0; while (n + 1 < starts.length && (starts[n + 1] ?? Infinity) <= offset) n += 1; return n + 1; };
  const list = statementsOf(text, lang);
  const found = BY_INDENT.has(lang.name) ? byIndent(code, starts) : byBraces(code);
  return found.map((f) => {
    const line = lineOf(f.from);
    const end = lineOf(f.to);
    return { name: f.name, line, end, params: f.params, statements: list.filter((s) => s.line >= line && s.line <= end).length };
  });
}
