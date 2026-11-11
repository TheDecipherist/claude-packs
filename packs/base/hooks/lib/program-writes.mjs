// program-writes: the files an inline program writes (KWB-8: `python3 - <<EOF ... open(p,'w').write(...)` got past every
// write-time hook; the shell reader saw redirects, tee, sed -i, cp and heredocs, not a program's own writes).
//   programOf(exe, args, stdin) -> { lang, code } | null
//     an interpreter given its program inline: python -c / python - or python with a heredoc on stdin; node -e / -p /
//     node - or a heredoc; perl -e / -E (or a heredoc); ruby -e (or a heredoc). A script file (python3 tools/x.py,
//     node tools/x.mjs, python3 -m mod) is null: it is the project's own tool, reviewed like code, not judged as a write.
//   programWrites(program, at, readText) -> [{ path, op, content, from? }]   (op and content as in shell-writes.mjs)
//     a write is a call that opens or makes a file for writing: python open(p, 'w'|'a'|'x'|'r+'), Path.write_text /
//     write_bytes / touch / unlink, shutil.copy* / move / copytree / rmtree, os.remove / rename / replace; node
//     fs.writeFileSync / appendFileSync / copyFileSync / cpSync / renameSync / rmSync / unlinkSync / createWriteStream;
//     perl open(FH, '>' ...), rename, unlink, File::Copy; ruby File.write / File.open(p, 'w') / FileUtils.*.
//     A read (open(p), open(p, 'r'), read_text, readFileSync) is never a write. content is the new text where the
//     program says it (a literal, or a file's text read and .replace'd, in a program with no loop or branch), else null.
//     A write whose path the reader cannot work out makes every path the program names (its path-like literals, less
//     the ones it only reads) a write of unknown content, so the path-based hooks still judge it.
import { basename, join } from 'node:path';
import { statSync } from 'node:fs';
import { closeOf, evaluate, scan, splitArgs, statements } from './program-read.mjs';

import { isDir } from './files.mjs';

export function programOf(exe, args, stdin) {
  const lang = /^python(\d+(\.\d+)*)?$|^pypy3?$/.test(exe) ? 'python' : /^(node|nodejs|bun)$/.test(exe) ? 'node' : exe === 'perl' ? 'perl' : exe === 'ruby' ? 'ruby' : null;
  if (!lang) return null;
  const inline = { python: /^-[A-Za-z]*c$/, node: /^(-e|--eval|-p|--print|-pe)$/, perl: /^-[A-Za-z]*[eE]$/, ruby: /^-[A-Za-z]*e$/ }[lang];
  const takesValue = { python: /^-[WXQ]$/, node: /^(-r|--require|--import|--loader|--experimental-loader|-C|--conditions)$/, perl: /^-[IMx]$/, ruby: /^-[Ir]$/ }[lang];
  const code = [];
  for (let k = 0; k < args.length; k += 1) {
    const a = args[k];
    if (inline.test(a)) { if (args[k + 1] !== undefined) code.push(args[k + 1]); k += 1; if (lang === 'python') break; continue; }
    if (lang === 'node' && /^--(eval|print)=/.test(a)) { code.push(a.slice(a.indexOf('=') + 1)); continue; }
    if (lang === 'python' && /^-[A-Za-z]*m$/.test(a)) return null;
    if (takesValue.test(a)) { k += 1; continue; }
    if (a.startsWith('-') && a !== '-') continue;
    if (code.length) break;
    return a === '-' && stdin !== null ? { lang, code: stdin } : null;
  }
  if (code.length) return { lang, code: code.join('\n') };
  return stdin !== null && stdin !== undefined ? { lang, code: stdin } : null;
}

// The receiver of a method call: the postfix expression that ends just before text[dot].
function receiverBefore(text, dot) {
  let k = dot - 1;
  while (k >= 0) {
    const c = text[k];
    if (c === ')' || c === ']') {
      const open = c === ')' ? '(' : '[';
      let depth = 0;
      for (; k >= 0; k -= 1) { if (text[k] === c) depth += 1; else if (text[k] === open && --depth === 0) break; }
      k -= 1;
    } else if (c === '\x02') k = text.lastIndexOf('\x01', k) - 1;
    else if (/[\w$.]/.test(c)) k -= 1;
    else break;
  }
  return text.slice(k + 1, dot);
}

const modeOp = (m) => (m === null ? 'write' : /^\+?>>|a/.test(m) ? 'append' : /^\+</.test(m) || /r\+/.test(m) ? 'edit' : /[wx>]|\+/.test(m) ? 'write' : null);

const SITES = {
  python: /(?<![\w.])(?:io\.|codecs\.)?open\s*\(|\.(open|write_text|write_bytes|touch|unlink|rmdir)\s*\(|\bshutil\.(copy|copy2|copyfile|move|copytree|rmtree)\s*\(|\bos\.(remove|unlink|rename|replace)\s*\(/g,
  node: /\b(writeFileSync|writeFile|appendFileSync|appendFile|copyFileSync|copyFile|cpSync|renameSync|rmSync|unlinkSync|createWriteStream|truncateSync|openSync|outputFileSync)\s*\(|\bBun\.(write)\s*\(/g,
  perl: /\bopen\s*(?=[\s(])|\b(rename|unlink|copy|move)\s*\(/g,
  ruby: /\b(?:File|IO)\.(write|binwrite|open|rename|delete|unlink)\s*\(|\bFileUtils\.(cp|copy|mv|move|rm|rm_f|rm_rf|touch|install)\s*\(/g,
};

const COPY = /^(copy|copy2|copyfile|copyFileSync|copyFile|cp|install)$/;
const MOVE = /^(move|rename|replace|renameSync|mv)$/;
const DELETE = /^(rmtree|remove|unlink|rmdir|rmSync|unlinkSync|delete|rm|rm_f|rm_rf)$/;

export function programWrites({ lang, code: src }, at, readText) {
  const { code, lits } = scan(src, lang);
  const stmts = statements(code);
  const branchy = /\b(for|while|foreach|until|unless|lambda|function|each|map|if|elif|else|try|switch|case|def)\b|=>|\bdo\b/.test(code);
  const ASSIGN = /^(?:(?:const|let|var|my|our)\s+)?([$@%]?[A-Za-z_][\w.]*)\s*(\+?)=(?!=)\s*([\s\S]+)$/;
  const count = new Map();
  for (const s of stmts) { const m = s.match(ASSIGN); if (m) count.set(m[1], (count.get(m[1]) ?? 0) + 1); }
  const env = new Map();
  const reads = new Set();
  const ctx = { env, lits, lang, at, readText, reads };
  const val = (e) => (e === undefined ? null : evaluate(e, ctx));
  const pathOf = (e) => { const v = val(e); return v && (v.t === 'str' || v.t === 'path') && v.v ? at(v.v) : null; };
  const textOf = (e) => { const v = val(e); return !branchy && v && v.t === 'str' ? v.v : null; };
  const out = [];
  const handles = new Map();
  let unresolved = false;
  const add = (path, op, content, extra = {}) => { if (path === null) unresolved = true; else out.push({ path, op, content, ...extra }); return out.at(-1); };
  const kw = (args, name) => args.find((a) => new RegExp(`^${name}\\s*=`).test(a))?.replace(/^\w+\s*=\s*/, '');
  const modeArg = (e) => (e === undefined ? undefined : val(e)?.t === 'str' ? val(e).v : null);

  for (const s of stmts) {
    for (const m of s.matchAll(SITES[lang])) {
      const name = m.slice(1).find(Boolean) ?? 'open';
      const paren = s.indexOf('(', m.index + m[0].length - 1);
      let args;
      let end;
      if (lang === 'perl' && name === 'open' && s[paren] !== '(' ) {
        const rest = s.slice(m.index + m[0].length).split(/\s+(?:or|\|\|)\s+|\s+or$/)[0];
        args = splitArgs(rest.replace(/^\s*\(|\)\s*$/g, ''));
        end = s.length;
      } else {
        end = closeOf(s, paren);
        if (end < 0) continue;
        args = splitArgs(s.slice(paren + 1, end));
      }
      const pos = args.filter((a) => !/^\w+\s*=[^=]/.test(a));
      const method = m[0].startsWith('.');
      const recv = method ? receiverBefore(s, m.index) : null;
      let site = null;
      if (lang === 'perl' && name === 'open') {
        const mode = pos.length >= 3 ? modeArg(pos[1]) : modeArg(pos[1]);
        if (pos.length >= 3) { const op = modeOp(mode); if (op) site = add(pathOf(pos[2]), op, null); } else if (mode !== null && mode !== undefined) {
          const two = mode.match(/^\s*(\+?[<>]{1,2}|\|)?\s*(.*)$/);
          const op = two[1] && two[1] !== '|' ? modeOp(two[1]) : null;
          if (op) site = add(two[2] ? at(two[2]) : null, op, null);
        } else if (pos[1] !== undefined) site = add(null, 'write', null);
      } else if (name === 'open' || name === 'openSync') {
        if (method && val(recv)?.t !== 'path') continue;
        const target = method ? recv : pos[0];
        const mode = modeArg(method ? pos[0] ?? kw(args, 'mode') : pos[1] ?? kw(args, 'mode'));
        const op = mode === undefined ? null : modeOp(mode);
        if (!op) { const p = pathOf(target); if (p) reads.add(p); continue; }
        site = add(pathOf(target), op, op === 'edit' ? null : '');
        const after = s.slice(end + 1);
        const chained = after.match(/^\s*\.\s*write\s*\(/);
        const as = after.match(/^\s*as\s+([A-Za-z_]\w*)/) ?? s.slice(0, m.index).match(/^([A-Za-z_]\w*)\s*=\s*$/);
        if (site && chained) { const e = closeOf(after, after.indexOf('(')); site.content = e < 0 ? null : textOf(after.slice(after.indexOf('(') + 1, e)); }
        else if (site && as) handles.set(as[1], { site, parts: [], ok: !branchy && site.content !== null, uses: 0 });
        else if (site) site.content = null;
      } else if (name === 'write_text' || name === 'write' || name === 'binwrite' || /^(writeFile|outputFile)/.test(name) || /^appendFile/.test(name)) {
        const target = method ? recv : pos[0];
        site = add(pathOf(target), /^append/.test(name) ? 'append' : 'write', name === 'binwrite' ? null : textOf(method ? pos[0] : pos[1]));
      } else if (name === 'write_bytes' || name === 'createWriteStream' || name === 'truncateSync') site = add(pathOf(method ? recv : pos[0]), name === 'truncateSync' ? 'truncate' : 'write', null);
      else if (name === 'touch') site = add(pathOf(method ? recv : pos[0]), 'touch', null);
      else if (DELETE.test(name)) { if (method && val(recv)?.t !== 'path') continue; for (const a of method ? [recv] : pos.slice(0, lang === 'ruby' ? pos.length : 1)) add(pathOf(a), 'delete', null); }
      else if (COPY.test(name) || MOVE.test(name) || /^(copytree|cpSync)$/.test(name)) {
        if (method) continue;
        const from = pathOf(pos[0]);
        let to = pathOf(pos[1]);
        if (to && from && isDir(to) && !/^(copytree|cpSync)$/.test(name)) to = join(to, basename(from));
        const tree = /^(copytree|cpSync)$/.test(name);
        add(to, MOVE.test(name) ? 'move' : 'copy', tree || !from ? null : readText(from), from ? { from } : {});
        if (MOVE.test(name)) add(from, 'delete', null);
      }
    }
    for (const [h, rec] of handles) {
      for (const m of s.matchAll(new RegExp(`(?<![\\w.])${h.replace(/\$/g, '\\$')}\\b`, 'g'))) {
        rec.uses += 1;
        const after = s.slice(m.index + h.length);
        const w = after.match(/^\s*\.\s*(write|close)\s*\(/);
        if (!w) continue;
        rec.uses -= 1;
        if (w[1] === 'close') continue;
        const open = m.index + h.length + after.indexOf('(');
        const e = closeOf(s, open);
        const t = e < 0 ? null : textOf(s.slice(open + 1, e));
        if (t === null) rec.ok = false; else rec.parts.push(t);
      }
    }
    const a = s.match(ASSIGN);
    if (a) {
      const v = branchy && count.get(a[1]) > 1 ? null : a[2] ? ((x, y) => (x?.t === 'str' && y?.t === 'str' ? { t: 'str', v: x.v + y.v } : null))(env.get(a[1]), val(a[3])) : val(a[3]);
      if (v) env.set(a[1], v); else env.delete(a[1]);
    }
  }
  for (const rec of handles.values()) rec.site.content = rec.ok && rec.uses <= 1 ? rec.parts.join('') : null;
  if (unresolved) {
    const named = new Set(out.map((w) => w.path));
    for (const l of lits) {
      if (l === null || l.length > 300 || !/^[~\w.@+\-/]+$/.test(l) || /^[-.]+$|^-|^\d+(\.\d+)*$/.test(l) || !(l.includes('/') || /\.[A-Za-z][A-Za-z0-9]{0,7}$/.test(l))) continue;
      const p = at(l);
      if (!named.has(p) && !reads.has(p)) { named.add(p); out.push({ path: p, op: 'write', content: null, named: true }); }
    }
  }
  return out;
}
