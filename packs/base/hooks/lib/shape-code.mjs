// shape-code: what the shape law reads in code beyond literal instances (lib/shape.mjs holds the number rule).
//   findSelectorDefs(text, file, shape) -> [{ line, text, concept, name, why, kind: 'selector' }]
//     a function whose name joins a concept word with pick/select/for/first/owner, defined here and not listed as a
//     selector (or the generator, or a constant) of that concept in design/shape.json
//   findUnknownTypes(text, file, shape) -> [{ line, text, concept: null, name, why, kind: 'type' }]
//     a new class/struct/enum whose name holds no concept's word and that looks like an instance container (an index
//     member, or it is made N times in an array): its concept has no row yet; a type in the manifest's "values" is skipped
import { extname } from 'node:path';
import { languageOf } from './languages.mjs';
import { conceptOfName, parts, SHAPE_FILE } from './shape.mjs';

export const CODE = /\.(c|cc|cpp|cxx|h|hh|hpp|hxx|inl|mm|m|js|mjs|cjs|ts|tsx|jsx|py|swift|rs|go|java|kt|cs)$/i;
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'sizeof', 'else', 'new', 'delete', 'case', 'throw', 'co_return', 'do', 'function', 'await', 'typeof']);
// The act of picking, never the thing that picks: a "picker" or "selector" is a component, and its accessor picks nothing (KWB-91).
const COMPONENT = /^(?:picker|selector)s?$/;
const PICKS = [(p) => p.startsWith('pick') && !COMPONENT.test(p), (p) => p.startsWith('select') && !COMPONENT.test(p),(p) => p.startsWith('owner') || p === 'owning', (p) => p === 'for', (p) => p === 'first'];
const ITERATES = new Set(['each', 'all', 'every', 'count', 'num', 'size']);

function definitions(text) {
  const out = [];
  const lines = text.split('\n');
  const RES = [
    /^\s*(?:(?:static|inline|constexpr|consteval|virtual|extern|friend|explicit|const|unsigned|signed|\[\[\w+\]\])\s+)*[A-Za-z_][\w:<>,*&]*\s*[*&]?\s+[*&]?([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?(?:->\s*[\w:<>*&\s]+)?\s*(?:\{|;|$)/,
    /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/,
    /^\s*(?:static\s+|async\s+|get\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/,
    /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/,
    /^\s*(?:pub\s+)?fn\s+([A-Za-z_]\w*)\s*[<(]/,
  ];
  lines.forEach((l, i) => {
    for (const re of RES) {
      const m = l.match(re);
      if (!m || KEYWORDS.has(m[1])) continue;
      const first = l.trim().split(/\s+/)[0];
      if (re === RES[0] && KEYWORDS.has(first)) continue;
      out.push({ line: i + 1, text: l.trim(), name: m[1] });
      break;
    }
  });
  return out;
}

export function findSelectorDefs(text, file, shape) {
  if (!shape || !CODE.test(file ?? '')) return [];
  const out = [];
  for (const d of definitions(text)) {
    const ps = parts(d.name);
    if (!PICKS.some((f) => ps.some(f)) || ps.some((p) => ITERATES.has(p))) continue;
    const concept = conceptOfName(d.name, shape);
    if (!concept) continue;
    const c = shape.concepts[concept];
    if (c.shape !== 'many' || c.selectors.includes(d.name) || c.constants.includes(d.name) || c.generatorName === d.name) continue;
    const listed = c.selectors.length ? `call a listed one (${c.selectors.join(', ')}) or ` : '';
    out.push({ ...d, concept, kind: 'selector', why: `defines ${d.name}, a selector for ${concept} that ${SHAPE_FILE} does not list — example, rule, or constant? (a rule is a named selector: ${listed}add "${d.name}": "<what it picks>" to the ${concept} row's selectors first)` });
  }
  return out;
}

function bodyOf(lines, i, python) {
  if (python) {
    const ind = lines[i].match(/^\s*/)[0].length;
    const body = [];
    for (let k = i + 1; k < lines.length && (lines[k].trim() === '' || lines[k].match(/^\s*/)[0].length > ind); k += 1) body.push(lines[k]);
    return body.join('\n');
  }
  const rest = lines.slice(i).join('\n');
  const open = rest.indexOf('{');
  if (open < 0) return '';
  let depth = 0;
  for (let k = open; k < rest.length; k += 1) {
    if (rest[k] === '{') depth += 1;
    else if (rest[k] === '}' && --depth === 0) return rest.slice(open, k + 1);
  }
  return rest.slice(open);
}

const INDEX_MEMBER = [
  /\b(?:int|size_t|std::size_t|unsigned|uint\w*|int\w*_t|short|long)\s+(?:index|idx|ix)\s*[;={]/,
  /\b(?:int|size_t|std::size_t|unsigned|uint\w*|int\w*_t|short|long)\s+\w*(?:Index|Idx|Ix)\s*[;={]/,
  /\b(?:this|self)\.(?:index|idx|ix|\w*(?:Index|Idx|Ix))\s*=/,
  /^\s*(?:index|idx|ix|\w*(?:Index|Idx|Ix))\s*[:=]/m,
];

// The type is made N times, N a named count: an array of it (std::array, T name[N], a vector of N, Array.from, a list comprehension). An
// array whose name or count holds a known concept word is that concept's (Box slot[4] is per slot, known); a table with a
// filled-in initializer is data, not instances.
function madeN(text, name, shape) {
  const N = '([A-Za-z_]\\w*|\\d+)';
  const res = [
    new RegExp(`std::array\\s*<\\s*${name}\\s*,\\s*${N}\\s*>\\s*(\\w*)(\\s*=?\\s*\\{[^}]*)?`, 'g'),
    new RegExp(`\\b${name}\\s+(?<arr>\\w+)\\s*\\[\\s*${N}\\s*\\](\\s*=?\\s*\\{[^}]*)?`, 'g'),
    new RegExp(`std::vector\\s*<\\s*${name}\\s*>\\s*(\\w+)\\s*[({]\\s*${N}\\s*[)}]()`, 'g'),
    new RegExp(`(\\w+)\\s*=\\s*Array\\.from\\(\\s*\\{\\s*length\\s*:\\s*${N}\\s*\\}[^)]*new\\s+${name}\\b()`, 'g'),
    new RegExp(`(\\w+)\\s*=\\s*\\[\\s*${name}\\(.*\\)\\s+for\\s+\\w+\\s+in\\s+range\\(\\s*${N}\\s*\\)()`, 'g'),
  ];
  for (const re of res) {
    for (const m of text.matchAll(re)) {
      const [count, arr, init] = re === res[0] ? [m[1], m[2], m[3]] : re === res[1] ? [m[2], m[1], m[3]] : [m[2], m[1], m[3]];
      if (/^\d+$/.test(count)) continue; // a literal size is a capacity or a fixed table; instances are counted by a named count
      if (init && /\{\s*[^}\s]/.test(init)) continue; // a table of values
      if (conceptOfName(arr ?? '', shape) || conceptOfName(count, shape)) continue;
      return true;
    }
  }
  return false;
}

export function findUnknownTypes(text, file, shape) {
  if (!shape || !CODE.test(file ?? '')) return [];
  const python = /\.py$/i.test(file);
  // A type is defined in code, never in a string or a comment: a fixture in a string is data (KWB-94). Blanking keeps every offset.
  const code = languageOf(extname(file).toLowerCase())?.blank(text) ?? text;
  const lines = code.split('\n');
  const out = [];
  lines.forEach((l, i) => {
    const m = python ? l.match(/^\s*class\s+([A-Za-z_]\w*)/) : l.match(/\b(?:class|struct|enum(?:\s+class|\s+struct)?)\s+(?:\[\[\w+\]\]\s+)?(?:alignas\([^)]*\)\s+)?([A-Za-z_]\w*)\s*(?:final\s*)?(?:extends\s+[\w.]+\s*)?(?::[^;{]*)?(?:\{|$)/);
    if (!m || /^\s*(?:\/\/|\*|#)/.test(l) || /\bfriend\b|\btemplate\s*<\s*class\b/.test(l)) return;
    const name = m[1];
    if (conceptOfName(name, shape) || shape.values?.has(name)) return; // a listed value type is not a container (KWB-10)
    const body = bodyOf(lines, i, python);
    const inArray = madeN(code, name, shape);
    if (!INDEX_MEMBER.some((re) => re.test(body)) && !inArray) return;
    out.push({ line: i + 1, text: l.trim(), concept: null, name, kind: 'type', why: `defines ${name}, a container of instances whose concept has no row in ${SHAPE_FILE} — add the row to ${SHAPE_FILE} first (one or many, its generator, its selectors), then build the type` });
  });
  return out;
}

// The definitions an edit adds: names defined after it that were not defined before it.
export function addedDefs(before, after, find) {
  const had = new Set(find(before ?? '').map((d) => d.name));
  return find(after ?? '').filter((d) => !had.has(d.name));
}
