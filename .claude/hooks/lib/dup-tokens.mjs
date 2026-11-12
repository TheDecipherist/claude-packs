// dup-tokens: a source text as the duplicate index reads it (KWB-24; moved out of dup-index.mts so the resident runner's index and the judge share it).
//   tokenize(text, path) -> { t, l }   the tokens (comments left out) and the line each is on
//   windows(t) -> number[]             FNV-1a over each run of WINDOW tokens, one number per window start
export const WINDOW = 20;
const C_LIKE = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|\d[\w.]*|\S/g;
const PY = /#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|[A-Za-z_]\w*|\d[\w.]*|\S/g;
/** The text's tokens (comments left out) and the line each is on. */
export function tokenize(text, path) {
    const python = /\.py$/i.test(path);
    const re = new RegExp((python ? PY : C_LIKE).source, 'g');
    const t = [];
    const l = [];
    let line = 1;
    let at = 0;
    for (const m of text.matchAll(re)) {
        const start = m.index ?? 0;
        for (let i = at; i < start; i += 1)
            if (text.charCodeAt(i) === 10)
                line += 1;
        const s = m[0];
        const comment = s.startsWith('//') || s.startsWith('/*') || (s.startsWith('#') && python);
        if (!comment) {
            t.push(s);
            l.push(line);
        }
        for (let i = 0; i < s.length; i += 1)
            if (s.charCodeAt(i) === 10)
                line += 1;
        at = start + s.length;
    }
    return { t, l };
}
/** FNV-1a over a window's tokens, one number per window start. */
export function windows(t) {
    const out = [];
    for (let i = 0; i + WINDOW <= t.length; i += 1) {
        let h = 0x811c9dc5;
        for (let k = i; k < i + WINDOW; k += 1) {
            const s = t[k] ?? '';
            for (let c = 0; c < s.length; c += 1) {
                h ^= s.charCodeAt(c);
                h = Math.imul(h, 0x01000193);
            }
            h ^= 0x1f;
            h = Math.imul(h, 0x01000193);
        }
        out.push(h >>> 0);
    }
    return out;
}
