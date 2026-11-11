// program-read: a small reader of an inline program (python, node, perl, ruby) for program-writes.mjs (KWB-8). It never
// runs the program; it reads string literals, splits statements, and evaluates the simple expressions a file-writing
// program uses (a literal, a variable, Path(...) and joins, a file's text read, .replace chains, + of strings).
//   scan(code, lang) -> { code, lits }   code: the program with every literal replaced by \x01n\x02 and comments blanked;
//                                        lits[n]: its text, or null when it interpolates (f-string, ${}, "$x")
//   statements(code) -> [string]         split at newlines and ; outside brackets
//   splitArgs(text) -> [string]          top-level comma split of a call's arguments
//   closeOf(text, open) -> index         the bracket that closes text[open]
//   evaluate(expr, ctx) -> value | null  value: { t: 'str'|'path', v }; ctx: { env, lang, at, readText, home }
const PAIRS = { '(': ')', '[': ']', '{': '}' };
const ESCAPES = { n: '\n', t: '\t', r: '\r', 0: '\0', '\\': '\\', "'": "'", '"': '"', '`': '`', $: '$' };
function unescape(s, lang) {
    return s.replace(/\\(\n|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|.)/gs, (m, e) => {
        if (e === '\n')
            return '';
        if (e[0] === 'x' && e.length === 3)
            return String.fromCharCode(parseInt(e.slice(1), 16));
        if (e[0] === 'u' && e.length === 5)
            return String.fromCharCode(parseInt(e.slice(1), 16));
        const mapped = ESCAPES[e];
        if (mapped !== undefined)
            return mapped;
        return lang === 'python' ? m : e;
    });
}
export function scan(src, lang) {
    const lits = [];
    let out = '';
    let i = 0;
    const hash = lang !== 'node';
    while (i < src.length) {
        const c = src[i] ?? '';
        if ((hash && c === '#') || (!hash && c === '/' && src[i + 1] === '/')) {
            while (i < src.length && src[i] !== '\n')
                i += 1;
            continue;
        }
        if (!hash && c === '/' && src[i + 1] === '*') {
            const j = src.indexOf('*/', i + 2);
            i = j < 0 ? src.length : j + 2;
            continue;
        }
        let pre = '';
        if (lang === 'python')
            pre = src.slice(i).match(/^[rRbBuUfF]{0,2}(?=['"])/)?.[0] ?? '';
        if (pre && /\w/.test(src[i - 1] ?? ''))
            pre = '';
        const q0 = src[i + pre.length];
        const quote = q0 === "'" || q0 === '"' || (q0 === '`' && lang === 'node') ? q0 : null;
        if (!quote || (pre === '' && /\w/.test(src[i - 1] ?? '') && lang === 'python')) {
            out += c;
            i += 1;
            continue;
        }
        const start = i + pre.length;
        const triple = lang === 'python' && src.startsWith(quote.repeat(3), start);
        const open = triple ? 3 : 1;
        let j = start + open;
        while (j < src.length && !(triple ? src.startsWith(quote.repeat(3), j) : src[j] === quote) && (triple || quote === '`' || src[j] !== '\n'))
            j += src[j] === '\\' ? 2 : 1;
        const raw = src.slice(start + open, j);
        i = Math.min(src.length, j + open);
        const rawFlag = /[rR]/.test(pre);
        let v;
        if (/[fF]/.test(pre) && /[{}]/.test(raw))
            v = null;
        else if (quote === '`' && raw.includes('${'))
            v = null;
        else if ((lang === 'perl' || lang === 'ruby') && quote === '"' && /[$@]|#\{/.test(raw))
            v = null;
        else if ((lang === 'perl' || lang === 'ruby') && quote === "'")
            v = raw.replace(/\\([\\'])/g, '$1');
        else
            v = rawFlag ? raw : unescape(raw, lang);
        out += `\x01${lits.length}\x02`;
        lits.push(v);
    }
    return { code: out, lits };
}
export function closeOf(text, open) {
    const want = PAIRS[text[open] ?? ''];
    let depth = 0;
    for (let k = open; k < text.length; k += 1) {
        const c = text[k] ?? '';
        if (PAIRS[c])
            depth += 1;
        else if (')]}'.includes(c)) {
            depth -= 1;
            if (depth === 0)
                return c === want ? k : -1;
        }
    }
    return -1;
}
function splitTop(text, seps) {
    const out = [];
    let depth = 0;
    let cur = '';
    for (const c of text) {
        if (PAIRS[c])
            depth += 1;
        else if (')]}'.includes(c))
            depth -= 1;
        if (depth <= 0 && seps.includes(c)) {
            out.push(cur);
            cur = '';
        }
        else
            cur += c;
    }
    out.push(cur);
    return out;
}
export const statements = (code) => splitTop(code, '\n;').map((s) => s.trim()).filter(Boolean);
export const splitArgs = (text) => (text.trim() ? splitTop(text, ',').map((s) => s.trim()) : []);
// A postfix chain: a primary (a literal, a name, a parenthesised expression) and its .name, (args) and [index] steps.
function chain(expr) {
    let k = 0;
    let primary;
    const lit = expr.match(/^\x01(\d+)\x02/);
    const name = expr.match(/^[A-Za-z_$][\w$]*/);
    if (lit) {
        primary = { lit: Number(lit[1]) };
        k = lit[0].length;
    }
    else if (expr[0] === '(') {
        const e = closeOf(expr, 0);
        if (e < 0)
            return null;
        primary = { group: expr.slice(1, e) };
        k = e + 1;
    }
    else if (name) {
        primary = { name: name[0] };
        k = name[0].length;
    }
    else
        return null;
    const steps = [];
    while (k < expr.length) {
        const rest = expr.slice(k);
        const dot = rest.match(/^\s*(?:\.|->|::)\s*([A-Za-z_$][\w$]*)/);
        if (dot) {
            steps.push({ name: dot[1] ?? '' });
            k += dot[0].length;
            continue;
        }
        const ws = (rest.match(/^\s*/)?.[0] ?? '').length;
        const bracket = rest[ws];
        if (bracket === '(' || bracket === '[') {
            const e = closeOf(expr, k + ws);
            if (e < 0)
                return null;
            steps.push(bracket === '(' ? { args: splitArgs(expr.slice(k + ws + 1, e)) } : { index: expr.slice(k + ws + 1, e) });
            k = e + 1;
            continue;
        }
        return null;
    }
    return { primary, steps };
}
const str = (v) => (v && (v.t === 'str' || v.t === 'path') ? v.v : null);
const joinPaths = (parts) => {
    const known = [];
    for (const p of parts) {
        if (p === null)
            return null;
        known.push(p);
    }
    return known.reduce((a, b) => (b.startsWith('/') ? b : a ? `${a.replace(/\/$/, '')}/${b}` : b), '');
};
// A path made of a part the reader cannot work out (a helper's own parameter) is unknown, never a path of null (KF-40: read_text on one
// crashed sixteen hooks).
const pathOf = (v) => (v === null ? null : { t: 'path', v });
const PATH_FNS = /^(?:(?:pathlib\.)?(?:Pure)?(?:Posix)?Path|os\.path\.join|path\.join|path\.resolve|join|resolve|File\.join|os\.path\.expanduser|os\.path\.abspath|path\.normalize)$/;
const READS = /^(?:(?:fs|fsp|fs\.promises)\.)?readFileSync$|^File\.read$|^IO\.read$/;
export function evaluate(expr, ctx) {
    const e = expr.trim().replace(/^await\s+/, '');
    if (!e)
        return null;
    const plus = splitTop(e, '+');
    if (plus.length > 1 && ctx.lang !== 'perl') {
        const vs = plus.map((p) => str(evaluate(p, ctx)));
        const known = [];
        for (const v of vs) {
            if (v === null)
                return null;
            known.push(v);
        }
        return { t: 'str', v: known.join('') };
    }
    if (ctx.lang === 'python') {
        const slash = splitTop(e, '/');
        if (slash.length > 1) {
            const vs = slash.map((p) => evaluate(p, ctx));
            return vs[0]?.t === 'path' ? pathOf(joinPaths(vs.map(str))) : null;
        }
    }
    const c = chain(e);
    if (!c)
        return null;
    // callee: the dotted name while the chain is still a plain name (os.path.join, p.read_text); recv: the value before its last dot
    let cur = null;
    let callee = null;
    let recv = null;
    let method = null;
    const { primary } = c;
    if ('lit' in primary) {
        const lit = ctx.lits[primary.lit];
        cur = lit === null || lit === undefined ? null : { t: 'str', v: lit };
    }
    else if ('group' in primary)
        cur = evaluate(primary.group, ctx);
    else {
        callee = primary.name;
        cur = ctx.env.get(callee) ?? null;
    }
    for (const s of c.steps) {
        if ('name' in s) {
            if (callee !== null) {
                recv = cur;
                callee = `${callee}.${s.name}`;
                cur = ctx.env.get(callee) ?? null;
            }
            else {
                method = s.name;
            }
            continue;
        }
        if ('args' in s) {
            if (callee !== null) {
                const last = callee.split('.').pop() ?? '';
                cur = callFn(callee, s.args, ctx) ?? (recv && callee.includes('.') ? callMethod(recv, last, s.args, ctx) : null);
                callee = null;
            }
            else
                cur = method && cur ? callMethod(cur, method, s.args, ctx) : null;
            method = null;
            recv = null;
            continue;
        }
        cur = null;
        callee = null;
        method = null;
    }
    return method ? null : cur;
}
function callFn(name, args, ctx) {
    const vs = args.filter((a) => !/^\w+\s*=[^=]/.test(a)).map((a) => evaluate(a, ctx));
    if (/(?:^|\.)Path\.home$/.test(name))
        return ctx.home ? { t: 'path', v: ctx.home } : null;
    if (/(?:^|\.)Path\.cwd$|^process\.cwd$|^os\.getcwd$/.test(name))
        return { t: 'path', v: ctx.at('.') };
    if (PATH_FNS.test(name))
        return vs.length ? pathOf(joinPaths(vs.map(str))) : null;
    if (READS.test(name) || /^(?:io\.|codecs\.)?open$/.test(name)) {
        const p = str(vs[0]);
        if (p === null)
            return null;
        ctx.reads?.add(ctx.at(p));
        return READS.test(name) ? { t: 'str', v: ctx.readText(ctx.at(p)) ?? '' } : { t: 'file', v: p };
    }
    return null;
}
function callMethod(base, m, args, ctx) {
    const vs = args.map((a) => evaluate(a, ctx));
    if (['expanduser', 'resolve', 'absolute'].includes(m))
        return base.t === 'path' ? base : null;
    if (m === 'joinpath')
        return pathOf(joinPaths([base.v, ...vs.map(str)]));
    if ((m === 'read_text' && base.t === 'path') || (m === 'read' && base.t === 'file')) {
        ctx.reads?.add(ctx.at(base.v));
        return { t: 'str', v: ctx.readText(ctx.at(base.v)) ?? '' };
    }
    if ((m === 'replace' || m === 'replaceAll') && base.t === 'str') {
        const [a, b] = vs.map(str);
        if (a === null || b === null || a === undefined || b === undefined || /^\//.test(args[0] ?? ''))
            return null;
        if (m === 'replace' && ctx.lang === 'node')
            return { t: 'str', v: base.v.replace(a, () => b) };
        const count = vs[2];
        const n = count ? Number(str(count) ?? args[2]) : -1;
        if (!(n < 0)) {
            let out = base.v;
            for (let k = 0; k < n && out.includes(a); k += 1)
                out = out.replace(a, () => b);
            return { t: 'str', v: out };
        }
        return { t: 'str', v: base.v.split(a).join(b) };
    }
    return null;
}
