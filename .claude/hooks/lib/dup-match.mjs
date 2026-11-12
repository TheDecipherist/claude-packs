// dup-match: the candidate clones of a write, from the windows it shares with other files (KWB-24; moved out of dup-index.mts, KWB-201).
// A candidate: the windows of the new text on its changed lines that are also in one other file, chained in order along one diagonal (a
// line changed inside a copy moves it by a few tokens; a gap of up to LIMITS.gap lines), covering LOOSE.tokens tokens over LOOSE.lines
// lines on either side, a little under jscpd's LIMITS (lib/dup.mts) so the candidates hold every clone jscpd finds (measured on a C++
// project's 752 sources: all 55 files jscpd flags are among them). A window found in more than COMMON places is boilerplate and never starts a match.
// The other files come as hits, only the windows whose hash the write holds: from the index in this process (windowHits), or from the resident
// runner's main thread, which holds the one index (the `dup:<hash>` keys of ctx.candidates).
//   prepare(writes) -> { texts, wanted }   each write's windows on its changed lines; `wanted` the hashes to look for
//   match(prepared, others) -> [{ at, other, lines, tokens }]   sides { file, start, end }
import { LIMITS, realPath } from './dup.mjs';
import { WINDOW, tokenize, windows } from './dup-tokens.mjs';
export const COMMON = 40;
// A candidate is looser than jscpd's clone (it counts tokens and lines its own way: a block jscpd reads as 7 lines can be 5
// here), so nothing jscpd would refuse is missed; jscpd then judges the candidates (judgeCopyWrites).
const LOOSE = { tokens: Math.round(LIMITS.tokens * 0.8), lines: LIMITS.lines - 2 };
/** The key the resident runner's index is asked a window hash by. */
export const dupKey = (hash) => `dup:${hash}`;
/** A file's hits for the hashes wanted: its windows as [hash, at, line, end]. */
export function windowHits(h, l, wanted) {
    const out = [];
    for (let j = 0; j < h.length; j += 1) {
        const hash = h[j] ?? 0;
        if (wanted.has(hash))
            out.push([hash, j, l[j] ?? 0, l[j + WINDOW - 1] ?? 0]);
    }
    return out;
}
export function prepare(writes) {
    const wanted = new Set();
    const texts = writes.map((w) => {
        const { t, l } = tokenize(w.after, w.path);
        const h = windows(t);
        const ranges = w.ranges ?? (w.range ? [w.range] : []);
        const want = new Map();
        for (let i = 0; i < h.length; i += 1) {
            if (!ranges.some(([lo, hi]) => (l[i] ?? 0) <= hi && (l[i + WINDOW - 1] ?? 0) >= lo))
                continue;
            const hash = h[i] ?? 0;
            const at = want.get(hash);
            if (at)
                at.push(i);
            else
                want.set(hash, [i]);
            wanted.add(hash);
        }
        return { w, l, h, want };
    });
    return { texts, wanted };
}
/** The clones the writes add, against the other files' hits (the index minus the written files, each other write of the call as it will be, the write itself elsewhere in its own text). */
export function match({ texts }, others) {
    const found = [];
    for (const q of texts) {
        if (!q.want.size)
            continue;
        const all = [...others, ...texts.map((o) => ({ file: realPath(o.w.path), hits: windowHits(o.h, o.l, new Set(q.want.keys())), self: o === q }))];
        const pairs = new Map();
        const seen = new Map();
        for (const o of all) {
            for (const [hash, j, line, end] of o.hits) {
                const is = q.want.get(hash);
                if (!is)
                    continue;
                seen.set(hash, (seen.get(hash) ?? 0) + 1);
                for (const i of is) {
                    if (o.self && Math.abs(i - j) < WINDOW)
                        continue;
                    const list = pairs.get(o);
                    if (list)
                        list.push([i, j, line, end]);
                    else
                        pairs.set(o, [[i, j, line, end]]);
                }
            }
        }
        for (const [o, ps] of pairs) {
            const real = ps.filter(([i]) => (seen.get(q.h[i] ?? 0) ?? 0) <= COMMON).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
            for (const c of chains(real, q.l)) {
                // either side's lines (jscpd counts a block written on 3 long lines that repeats one of 7 lines)
                const qStart = q.l[c.start] ?? 0;
                const qEnd = q.l[c.end - 1] ?? 0;
                const lines = Math.max(qEnd - qStart + 1, c.oTo - c.oFrom + 1);
                if (c.covered < LOOSE.tokens || lines < LOOSE.lines)
                    continue;
                found.push({ at: { file: realPath(q.w.path), start: qStart, end: qEnd }, other: { file: o.file, start: c.oFrom, end: c.oTo }, lines, tokens: c.covered });
            }
        }
    }
    return found;
}
/** Matched window pairs [i (new), j (other)], sorted by i, chained along a diagonal: a change of a few tokens inside a copy
 *  keeps it one chain; a gap of more than LIMITS.gap lines in the new text ends it. */
function chains(pairs, lines) {
    const out = [];
    for (const [i, j, line, end] of pairs) {
        const d = j - i;
        const c = out.find((x) => Math.abs(x.d - d) <= 12 && i >= x.lastI && (lines[i] ?? 0) <= (lines[x.end - 1] ?? 0) + LIMITS.gap + 1);
        if (!c) {
            out.push({ start: i, end: i + WINDOW, covered: WINDOW, d, lastI: i, oFrom: line, oTo: end });
            continue;
        }
        if (i === c.lastI && d === c.d)
            continue;
        c.covered += Math.max(0, i + WINDOW - Math.max(i, c.end));
        c.end = Math.max(c.end, i + WINDOW);
        c.d = d;
        c.lastI = i;
        c.oFrom = Math.min(c.oFrom, line);
        c.oTo = Math.max(c.oTo, end);
    }
    return out;
}
