// shell-lex: a shell command's text as words and operators, for shell-writes. Split out of shell-writes.mjs when it
// passed the 300-line limit (KWB-118); its one job is reading the text, never judging what the command does.
//
//   cutHeredocs(command) -> { text, bodies }   each heredoc's body cut out, in order, its marker left as <<HEREDOCn
//   lex(text) -> [{ w } | { op, fd?, doc? }]  words with their quotes removed, and the operators: redirections,
//       ;, &&, ||, |, &, and the child-shell marks ( ) $( and the backtick, which shellWrites keeps a folder for
//   dropHeredocs(command) -> text              heredoc bodies removed (W2.5: the one owner; the guards used 8 copies)
//   blankQuotes(text) -> text                  every quoted string made '' (the guards used 4 copies)
//   splitCommand(text, opts) -> [segment]      the pieces between &&, ||, ;, | (and newline, &, subshell marks on request)
//   installedPackages(command) -> [{ part, packages }]   each npm/pnpm/yarn/bun install|add and what it names
// Text inside quotes, and a heredoc's body, is never read as a command.
// Heredoc bodies are cut out of the command and kept, in order, for the command that reads them.
export function cutHeredocs(command) {
    const lines = command.split('\n');
    const out = [];
    const bodies = [];
    const MARK = /(?<!<)<<(?!<)(-?)\s*(['"]?)([A-Za-z_][\w-]*)\2/g;
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i] ?? '';
        const marks = [...line.matchAll(MARK)];
        let n = bodies.length;
        out.push(line.replace(MARK, () => ` <<HEREDOC${n++} `));
        for (const m of marks) {
            const body = [];
            const end = (l) => (m[1] ? l.replace(/^\t+/, '') : l) === m[3];
            while (i + 1 < lines.length && !end(lines[i + 1] ?? '')) {
                i += 1;
                const l = lines[i] ?? '';
                body.push(m[1] ? l.replace(/^\t+/, '') : l);
            }
            i += 1;
            bodies.push(body.length ? `${body.join('\n')}\n` : '');
        }
    }
    return { text: out.join('\n'), bodies };
}
// Words and operators, quotes removed from words; a heredoc is its marker word.
export function lex(text) {
    const tokens = [];
    let cur = null;
    let i = 0;
    const push = () => { if (cur !== null)
        tokens.push({ w: cur }); cur = null; };
    while (i < text.length) {
        const c = text[i] ?? '';
        const next = text[i + 1] ?? '';
        if (c === "'") {
            const j = text.indexOf("'", i + 1);
            cur = (cur ?? '') + text.slice(i + 1, j < 0 ? text.length : j);
            i = j < 0 ? text.length : j + 1;
            continue;
        }
        if (c === '"') {
            let j = i + 1;
            let s = '';
            while (j < text.length && text[j] !== '"') {
                const after = text[j + 1] ?? '';
                if (text[j] === '\\' && j + 1 < text.length && '"\\$`'.includes(after)) {
                    s += after;
                    j += 2;
                }
                else {
                    s += text[j] ?? '';
                    j += 1;
                }
            }
            cur = (cur ?? '') + s;
            i = j + 1;
            continue;
        }
        if (c === '\\' && i + 1 < text.length) {
            if (next !== '\n')
                cur = (cur ?? '') + next;
            i += 2;
            continue;
        }
        if (c === '\n') {
            push();
            tokens.push({ op: ';' });
            i += 1;
            continue;
        }
        if (/\s/.test(c)) {
            push();
            i += 1;
            continue;
        }
        if (c === '#' && cur === null) {
            while (i < text.length && text[i] !== '\n')
                i += 1;
            continue;
        }
        const rest = text.slice(i);
        const redir = rest.match(/^(&>>|&>|>>|>\||>&\d*-?|>|<<<|<<HEREDOC(\d+)|<)/);
        if (redir && (cur === null || /^\d+$/.test(cur))) {
            const fd = cur ?? '';
            const op = redir[1] ?? '';
            cur = null;
            tokens.push({ op: redir[2] !== undefined ? '<<' : op.startsWith('>&') ? '>&' : op, fd, doc: redir[2] !== undefined ? Number(redir[2]) : undefined });
            i += redir[0].length;
            continue;
        }
        const ctl = rest.match(/^(&&|\|\||\|&|\||;|&|\(|\)|\x60|\$\()/);
        if (ctl) {
            const o = ctl[1] ?? '';
            push();
            tokens.push({ op: o === '|&' ? '|' : o });
            i += o.length;
            continue;
        }
        cur = (cur ?? '') + c;
        i += 1;
    }
    push();
    return tokens;
}
// A heredoc and its body, to its closing marker line, taken out of a command the guards judge by its words.
export const dropHeredocs = (command) => command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, '');
// Each quoted string made empty, so a word inside a quote is never read as a command.
export const blankQuotes = (text) => text.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, "''");
// The pieces of a command between its control operators.
export function splitCommand(text, opts = {}) {
    const seps = ['&&', '\\|\\|', ';', '\\|'];
    if (opts.newline)
        seps.push('\\n');
    if (opts.background)
        seps.push('(?<![&>])&(?![&>])');
    if (opts.subshell)
        seps.push('\\(', '\\)', '`', '\\$\\(');
    return text.split(new RegExp(seps.join('|')));
}
const MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];
const INSTALLS = ['i', 'install', 'add'];
// Every `npm|pnpm|yarn|bun install|add` in a command, with the arguments that are not flags.
export function installedPackages(command) {
    const found = [];
    for (const part of splitCommand(dropHeredocs(command))) {
        const w = part.trim().split(/\s+/);
        const at = w.findIndex((x, i) => MANAGERS.includes(w[i - 1] ?? '') && INSTALLS.includes(x));
        if (at < 0)
            continue;
        found.push({ part: part.trim(), packages: w.slice(at + 1).filter((x) => !x.startsWith('-')) });
    }
    return found;
}
