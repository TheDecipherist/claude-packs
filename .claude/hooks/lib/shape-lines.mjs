// shape-lines: what a line and an identifier say about a concept (split out of shape.mts at its line limit).
// A literal instance of a concept is allowed only as:
//   example   the line opens with "seen in:" or "example:" (after comment marks, a bullet or a table bar);
//   selector  the line uses a selector listed for the concept;
//   constant  the line uses a declared constant's name.
//   classify(line, concept, shape) -> 'example' | 'selector' | 'constant' | null
//   conceptOfType(name, shape) -> concept name | null
import { escapeRegExp } from './glob.mjs';
import { withRuns } from './identifier-runs.mjs';
import { parts } from './shape-model.mjs';
const COUNTISH = new Set(['size', 'length', 'count', 'num', 'number', 'total', 'max', 'min', 'n', 'len', 'capacity']);
const INDEXISH = new Set(['index', 'idx', 'ix', 'id', 'no']);
/** True for a part that says "how many" (size, count, num ...). */
export const isCountish = (part) => COUNTISH.has(part);
// The line opens with "seen in:" or "example:", after comment marks, a bullet, a heading mark or a table bar.
// The leading marks are stripped one at a time in a loop, never by one regex with a repeated group of marks that can each be "-"
// or "--": on a long row of dashes that cannot match, that regex tried every split of the dashes, exponential in the length (KWB-6:
// a 75-dash comment in a CMakeLists hung shape scan, shape-law and brief-guard).
const MARK = /^\s*(?:[-*+>|]|\d+[.)]|\/\/+|\/\*+|#+|<!--|;+)/;
const OPENS = /^\s*(?:seen in|example)\s*:/i;
const EXAMPLE_CELL = /^\s*\|[^\n]*\|\s*(?:seen in|example)\s*:/i;
export function isExampleLine(line) {
    let rest = line;
    for (let m = rest.match(MARK); m && m[0].length > 0; m = rest.match(MARK))
        rest = rest.slice(m[0].length);
    return OPENS.test(rest) || EXAMPLE_CELL.test(line);
}
export const named = (line, name) => new RegExp(`(?<![\\w])${escapeRegExp(name)}(?![\\w])`).test(line);
export function classify(line, concept, shape) {
    const c = typeof concept === 'string' ? shape?.concepts?.[concept] : concept;
    if (isExampleLine(line))
        return 'example';
    if (!c)
        return null;
    if (c.selectors.some((s) => named(line, s)))
        return 'selector';
    if (c.constants.some((s) => named(line, s)))
        return 'constant';
    return null;
}
// The concept an identifier names: a part, or a run of parts, equal to one of a concept's words (KWB-93).
export function conceptOfName(name, shape, { singleOnly = false } = {}) {
    const ps = withRuns(parts(name));
    for (const c of Object.values(shape?.concepts ?? {}))
        if (ps.some((p) => (singleOnly ? c.single : c.words).includes(p)))
            return c.name;
    return null;
}
export const conceptOfType = (name, shape) => conceptOfName(name, shape);
// The concept an expression compares or indexes: its last member (or the one before an index-like member), when that names
// a concept in the singular and is not a count (slots.size(), numSlots).
export function conceptOfExpr(expr, shape, aliases) {
    const segs = expr.split(/\.|->|::|\(\)|\[[^\]]*\]/).map((s) => s.trim()).filter(Boolean);
    let last = segs.at(-1);
    if (last === undefined)
        return null;
    const alias = aliases.get(last);
    if (alias !== undefined)
        return alias;
    if (INDEXISH.has(last.toLowerCase()) && segs.length > 1)
        last = segs.at(-2) ?? last;
    const ps = parts(last);
    if (ps.some((p) => COUNTISH.has(p)))
        return null;
    for (const c of Object.values(shape.concepts)) {
        if (ps.some((p) => c.plural.has(p)))
            return null;
        if (ps.some((p) => c.single.includes(p)))
            return c.name;
    }
    return null;
}
// Loop variables bounded by a concept's count, and locals set from a concept-named expression, stand for that concept.
export function aliasesOf(text, shape) {
    const out = new Map();
    const bound = (b) => { const ps = parts(b); for (const c of Object.values(shape.concepts))
        if (ps.some((p) => c.words.includes(p)))
            return c.name; return null; };
    for (const m of text.matchAll(/for\s*\(\s*(?:[\w:<>]+\s+)?(\w+)\s*=\s*\d+\s*;\s*\1\s*<=?\s*([\w.:>()\-]+)/g)) {
        const c = bound(m[2] ?? '');
        if (c && m[1])
            out.set(m[1], c);
    }
    for (const m of text.matchAll(/for\s+(\w+)\s+in\s+range\(([^)]*)\)/g)) {
        const c = bound(m[2] ?? '');
        if (c && m[1])
            out.set(m[1], c);
    }
    for (const m of text.matchAll(/\b(?:int|auto|size_t|std::size_t|unsigned|uint\w*|int\w*_t|let|const|var)\s+(\w+)\s*=\s*([A-Za-z_][\w.:>\-]*(?:\(\))?)\s*;/g)) {
        const c = conceptOfExpr(m[2] ?? '', shape, new Map());
        if (c && m[1])
            out.set(m[1], c);
    }
    return out;
}
