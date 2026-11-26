// dup-tokens: a source text as the duplicate index reads it (KWB-24; moved out of dup-index.mts so the resident runner's index and the judge share it).
//   tokenize(text, path) -> { t, l }   the tokens (comments left out) and the line each is on
//   windows(t) -> number[]             FNV-1a over each run of WINDOW tokens, one number per window start
export const WINDOW = 20;

const C_LIKE = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|\d[\w.]*|\S/g;
const PY = /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|[A-Za-z_]\w*|\d[\w.]*|\S/g;

export interface Tokens { t: string[]; l: number[] }

/** C and C++ sources, whose override declarations are left out (KWB-243). */
const C_FAMILY = /\.(?:h|hh|hpp|hxx|c|cc|cpp|cxx|mm|m|inl|ipp)$/i;
/** One line that declares a member overriding a virtual, with no body: `void paint (juce::Graphics& g) override;`. A
    component's mouseDown, mouseDrag, mouseUp and mouseWheelMove are the toolkit's interface, declared alike in every
    class that takes the mouse; read as code they were a "copy" no function could hold (KWB-243). */
// One line's tail, from its last `)`: anything but `;{}()` around the word `override`, then `;` (KWB-248: the first form
// ran over every line of a file from its start, 163 ms in three judges of one source file; the line is now tested only
// where it holds the word, and the pattern anchored at its last `)`)
const OVERRIDE_TAIL = /^\)[^;{}()]*\boverride\b[^;{}()]*;[ \t]*$/;

/** Whether `line` declares a member overriding a virtual with no body. */
function overrideDeclaration(line: string): boolean {
  if (!line.includes('override') || line.includes('{') || line.includes('}')) return false;
  const close = line.lastIndexOf(')');
  return close >= 0 && !line.slice(0, close).includes(';') && OVERRIDE_TAIL.test(line.slice(close));
}

/** `text` with each override declaration's line emptied, its newline kept, so every other token keeps its line. */
function withoutOverrideDeclarations(text: string, path: string): string {
  if (!C_FAMILY.test(path) || !text.includes('override')) return text;
  return text.split('\n').map((line) => (overrideDeclaration(line) ? '' : line)).join('\n');
}

/** The text's tokens (comments and, in C and C++, override declarations left out) and the line each is on. */
export function tokenize(source: string, path: string): Tokens {
  const text = withoutOverrideDeclarations(source, path);
  const python = /\.py$/i.test(path);
  const re = new RegExp((python ? PY : C_LIKE).source, 'g');
  const t: string[] = [];
  const l: number[] = [];
  let line = 1;
  let at = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    for (let i = at; i < start; i += 1) if (text.charCodeAt(i) === 10) line += 1;
    const s = m[0];
    const comment = s.startsWith('//') || s.startsWith('/*') || (s.startsWith('#') && python);
    if (!comment) { t.push(s); l.push(line); }
    for (let i = 0; i < s.length; i += 1) if (s.charCodeAt(i) === 10) line += 1;
    at = start + s.length;
  }
  return { t, l };
}

/** FNV-1a over a window's tokens, one number per window start. */
export function windows(t: readonly string[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + WINDOW <= t.length; i += 1) {
    let h = 0x811c9dc5;
    for (let k = i; k < i + WINDOW; k += 1) {
      const s = t[k] ?? '';
      for (let c = 0; c < s.length; c += 1) { h ^= s.charCodeAt(c); h = Math.imul(h, 0x01000193); }
      h ^= 0x1f; h = Math.imul(h, 0x01000193);
    }
    out.push(h >>> 0);
  }
  return out;
}
