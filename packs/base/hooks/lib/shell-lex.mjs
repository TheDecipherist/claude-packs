// shell-lex: a shell command's text as words and operators, for shell-writes. Split out of shell-writes.mjs when it
// passed the 300-line limit (KWB-118); its one job is reading the text, never judging what the command does.
//
//   cutHeredocs(command) -> { text, bodies }   each heredoc's body cut out, in order, its marker left as <<HEREDOCn
//   lex(text) -> [{ w } | { op, fd?, doc? }]  words with their quotes removed, and the operators: redirections,
//       ;, &&, ||, |, &, and the child-shell marks ( ) $( and the backtick, which shellWrites keeps a folder for
// Text inside quotes, and a heredoc's body, is never read as a command.

// Heredoc bodies are cut out of the command and kept, in order, for the command that reads them.
export function cutHeredocs(command) {
  const lines = command.split('\n');
  const out = [];
  const bodies = [];
  const MARK = /(?<!<)<<(?!<)(-?)\s*(['"]?)([A-Za-z_][\w-]*)\2/g;
  for (let i = 0; i < lines.length; i += 1) {
    const marks = [...lines[i].matchAll(MARK)];
    let n = bodies.length;
    out.push(lines[i].replace(MARK, () => ` <<HEREDOC${n++} `));
    for (const m of marks) {
      const body = [];
      const end = (l) => (m[1] ? l.replace(/^\t+/, '') : l) === m[3];
      while (i + 1 < lines.length && !end(lines[i + 1])) body.push(m[1] ? lines[++i].replace(/^\t+/, '') : lines[++i]);
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
  const push = () => { if (cur !== null) tokens.push({ w: cur }); cur = null; };
  while (i < text.length) {
    const c = text[i];
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
        if (text[j] === '\\' && j + 1 < text.length && '"\\$`'.includes(text[j + 1])) { s += text[j + 1]; j += 2; } else s += text[j++];
      }
      cur = (cur ?? '') + s;
      i = j + 1;
      continue;
    }
    if (c === '\\' && i + 1 < text.length) {
      if (text[i + 1] !== '\n') cur = (cur ?? '') + text[i + 1];
      i += 2;
      continue;
    }
    if (c === '\n') { push(); tokens.push({ op: ';' }); i += 1; continue; }
    if (/\s/.test(c)) { push(); i += 1; continue; }
    if (c === '#' && cur === null) { while (i < text.length && text[i] !== '\n') i += 1; continue; }
    const rest = text.slice(i);
    const redir = rest.match(/^(&>>|&>|>>|>\||>&\d*-?|>|<<<|<<HEREDOC(\d+)|<)/);
    if (redir && (cur === null || /^\d+$/.test(cur))) {
      const fd = cur ?? '';
      cur = null;
      tokens.push({ op: redir[2] !== undefined ? '<<' : redir[1].startsWith('>&') ? '>&' : redir[1], fd, doc: redir[2] !== undefined ? Number(redir[2]) : undefined });
      i += redir[0].length;
      continue;
    }
    const ctl = rest.match(/^(&&|\|\||\|&|\||;|&|\(|\)|`|\$\()/);
    if (ctl) { push(); tokens.push({ op: ctl[1] === '|&' ? '|' : ctl[1] }); i += ctl[1].length; continue; }
    cur = (cur ?? '') + c;
    i += 1;
  }
  push();
  return tokens;
}
