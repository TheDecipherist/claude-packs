// shell-writes: the files a shell command writes, and what it writes into them where that can be known.
// Every guard that refuses a write judges the shell's writes through this, so no guard has a route the
// Write tool lacks (WB-69: a guard covered Write and Edit while `cat > file <<EOF` walked past it).
//
//   shellWrites(command, cwd) -> [{ path, op, content, from?, sed? }]
//     op: write (>, >|, &>, tee), append (>>, &>>, tee -a), copy (cp, install, rsync), move (mv; its source
//         is a delete), link (ln), edit (sed -i, perl -i, ruby -i), truncate, touch, delete (rm, unlink, shred, mv's source)
//     and an inline program's own writes (python -c / python - <<EOF, node -e, perl -e, ruby -e: program-writes.mjs,
//         KWB-8); a script file run by an interpreter (python3 tools/x.py) is the project's own tool, not a write.
//     content: the text written (an echo or printf, a heredoc or here-string, a cat of known files, what a pipe
//         carries into tee, the source of a cp or mv), or null when it cannot be known.
//   afterText(write) -> { before, after }   after is null when it cannot be known; sed -i is run for real on a
//         copy of the text, in GNU sed's --sandbox (no e, r or w commands), so its result is exact.
//   `node shell-writes.mjs --json` reads { command, cwd } on stdin and prints the writes with before and after
//   (the python hooks use this, so there is one reader of the shell). `--selftest`: each route and program form.
// Text inside quotes, and a heredoc's body, is never read as a command.
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bareWords } from './command-prefix.mjs';
import { programOf, programWrites } from './program-writes.mjs';

const HOME = process.env.HOME ?? '';
// A path that starts with a variable is where that variable points, never a folder of this name in the project (KWB-44). One not set is somewhere unknown.
const expand = (p) => p.replace(/^(~|\$HOME|\$\{HOME\})(?=\/|$)/, HOME).replace(/^\$\{?([A-Za-z_]\w*)\}?(?=\/|$)/, (_, name) => process.env[name] ?? `/unresolved-${name}`);
const NOT_FILES = new Set(['/dev/null', '/dev/stdout', '/dev/stderr', '/dev/tty']);

export function readText(path) {
  try {
    const st = statSync(path);
    if (!st.isFile() || st.size > 8 * 1024 * 1024) return null;
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}
const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };

// Heredoc bodies are cut out of the command and kept, in order, for the command that reads them.
function cutHeredocs(command) {
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
function lex(text) {
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

function printf(args) {
  if (!args.length) return '';
  const esc = (s) => s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
  const [fmt, ...vals] = args;
  const slots = (fmt.match(/%[sdbq]/g) ?? []).length;
  if (!slots) return esc(fmt);
  let out = '';
  let k = 0;
  do {
    out += esc(fmt).replace(/%[sdbq]/g, () => vals[k++] ?? '');
  } while (k < vals.length);
  return out;
}

// One simple command: its words, redirections and stdin, and what it writes.
function judge(cmd, cwd, stdin, writes, bodies) {
  const words = bareWords(cmd.words);
  const at = (p) => resolve(cwd, expand(p));
  let input = stdin;
  for (const r of cmd.redirs) {
    if (r.op === '<<') input = bodies[r.doc] ?? null;
    else if (r.op === '<<<') input = `${r.target}\n`;
    else if (r.op === '<') input = readText(at(r.target));
  }
  const exe = words.length ? basename(words[0]) : '';
  const args = words.slice(1);
  const flags = args.filter((a) => a.startsWith('-'));
  const plain = args.filter((a) => !a.startsWith('-'));
  let stdout = null;
  if (exe === 'echo') {
    const n = args[0] === '-n' || args[0] === '-ne' || args[0] === '-en';
    const e = /^-[ne]*e/.test(args[0] ?? '');
    const text = args.filter((a, k) => !(k === 0 && /^-[neE]+$/.test(a))).join(' ');
    stdout = (e ? text.replace(/\\n/g, '\n').replace(/\\t/g, '\t') : text) + (n ? '' : '\n');
  } else if (exe === 'printf') stdout = printf(args);
  else if (exe === 'cat') stdout = plain.length ? plain.map((f) => readText(at(f))).reduce((a, b) => (a === null || b === null ? null : a + b), '') : input;
  else if (exe === 'tee') stdout = input;
  else if (exe === '' && cmd.redirs.some((r) => r.op === '<<' || r.op === '<<<')) stdout = input;
  else if (exe === ':' || exe === 'true') stdout = '';

  const add = (path, op, content, extra = {}) => { if (!NOT_FILES.has(path)) writes.push({ path, op, content, ...extra }); };
  for (const r of cmd.redirs) {
    if (!['>', '>>', '>|', '&>', '&>>'].includes(r.op) || !r.target) continue;
    const toStdout = r.fd === '' || r.fd === '1' || r.op.startsWith('&');
    add(at(r.target), r.op.includes('>>') ? 'append' : 'write', toStdout ? stdout : null);
  }
  if (exe === 'tee') for (const f of plain) add(at(f), flags.some((x) => /^-\w*a/.test(x) || x === '--append') ? 'append' : 'write', input);
  if (['cp', 'mv', 'install', 'rsync', 'ln'].includes(exe)) {
    const t = args.findIndex((a) => a === '-t' || a === '--target-directory');
    const dirArg = t >= 0 ? args[t + 1] : null;
    const files = plain.filter((a) => a !== dirArg && !(['install'].includes(exe) && /^\d{3,4}$/.test(a)));
    const srcs = dirArg ? files : files.slice(0, -1);
    const dest = dirArg ?? files.at(-1);
    if (dest && srcs.length) {
      for (const s of srcs) {
        const into = dirArg || srcs.length > 1 || dest.endsWith('/') || isDir(at(dest));
        const target = into ? join(at(dest), basename(s)) : at(dest);
        const op = exe === 'mv' ? 'move' : exe === 'ln' ? 'link' : 'copy';
        add(target, op, exe === 'ln' ? null : readText(at(s)), { from: at(s) });
        if (exe === 'mv') add(at(s), 'delete', null);
      }
    }
  }
  if (exe === 'sed' && args.some((a) => a === '-i' || a.startsWith('-i') || a.startsWith('--in-place'))) {
    const scripts = [];
    const keep = [];
    const files = [];
    for (let k = 0; k < args.length; k += 1) {
      const a = args[k];
      if (a === '-i' && args[k + 1] === '') { k += 1; continue; } // BSD: -i ''
      if (a === '-e' || a === '--expression') { scripts.push(args[++k]); continue; }
      if (a.startsWith('--expression=')) { scripts.push(a.slice(13)); continue; }
      if (a === '-f' || a === '--file') { scripts.push(null); k += 1; continue; }
      if (/^-[^-]/.test(a)) { for (const f of a.slice(1).replace(/i.*$/, '')) if ('Ernsz'.includes(f)) keep.push(`-${f}`); continue; }
      if (a.startsWith('--')) { if (['--regexp-extended', '--quiet', '--silent', '--separate', '--null-data'].includes(a)) keep.push(a); continue; }
      if (!scripts.length) scripts.push(a); else files.push(a);
    }
    for (const f of files) add(at(f), 'edit', null, { sed: scripts.includes(null) ? null : { flags: keep, scripts } });
  }
  if ((exe === 'perl' || exe === 'ruby') && args.some((a) => /^-\w*i/.test(a))) {
    const files = [];
    for (let k = 0; k < args.length; k += 1) {
      if (/^-\w*[eE]$/.test(args[k])) { k += 1; continue; } // -e, -pe, -ne: the next word is the program
      if (!args[k].startsWith('-')) files.push(args[k]);
    }
    for (const f of files) add(at(f), 'edit', null);
  }
  const program = programOf(exe, args, input);
  if (program) for (const w of programWrites(program, at, readText)) add(w.path, w.op, w.content, w.from ? { from: w.from } : {});
  if (exe === 'dd') for (const a of args) if (a.startsWith('of=')) add(at(a.slice(3)), 'write', null);
  if (exe === 'truncate') {
    const k = args.findIndex((a) => a === '-s' || a.startsWith('--size'));
    const size = k >= 0 ? (args[k].includes('=') ? args[k].split('=')[1] : args[k + 1]) : null;
    for (const f of plain.filter((a) => a !== size)) add(at(f), 'truncate', size === '0' ? '' : null);
  }
  if (exe === 'touch') for (const f of plain) add(at(f), 'touch', null);
  if (['rm', 'unlink', 'shred'].includes(exe)) for (const f of plain) add(at(f), 'delete', null);
  return { stdout, cd: exe === 'cd' && plain[0] ? at(plain[0]) : null };
}

export function shellWrites(command = '', cwd = process.cwd()) {
  const { text, bodies } = cutHeredocs(command);
  const writes = [];
  let here = cwd;
  const folders = [];   // the folder each open child shell started in (KWB-117)
  let ticked = false;   // inside a backtick substitution
  let cmd = { words: [], redirs: [] };
  let pipeIn = null;
  const tokens = lex(text);
  // a variable set earlier in the command ("S=/tmp/x; cat > $S/a.md") names that folder, not "<cwd>/$S" (KWB-18); one never set
  // stays as written
  const vars = {};
  const sub = (w) => w.replace(/\$(?:\{(\w+)\}|(\w+))/g, (m, a, b) => vars[a ?? b] ?? m);
  const flush = () => {
    if (cmd.words.length && !cmd.redirs.length && cmd.words.every((w) => /^[A-Za-z_]\w*=/.test(w))) {
      for (const w of cmd.words) { const i = w.indexOf('='); vars[w.slice(0, i)] = sub(w.slice(i + 1)); }
      cmd = { words: [], redirs: [] };
      pipeIn = null;
      return;
    }
    cmd = { words: cmd.words.map(sub), redirs: cmd.redirs.map((r) => (r.target === undefined ? r : { ...r, target: sub(r.target) })) };
    if (cmd.words.length || cmd.redirs.length) {
      const r = judge(cmd, here, pipeIn, writes, bodies);
      if (r.cd) here = r.cd;
      pipeIn = r.stdout;
    } else pipeIn = null;
    cmd = { words: [], redirs: [] };
  };
  for (let k = 0; k < tokens.length; k += 1) {
    const t = tokens[k];
    if (t.w !== undefined) { cmd.words.push(t.w); continue; }
    if (['>', '>>', '>|', '&>', '&>>', '<', '<<<'].includes(t.op)) {
      const next = tokens[k + 1];
      if (next?.w !== undefined) { cmd.redirs.push({ op: t.op, fd: t.fd, target: next.w }); k += 1; }
      continue;
    }
    if (t.op === '<<') { cmd.redirs.push({ op: '<<', doc: t.doc }); continue; }
    if (t.op === '>&') continue;
    // ( ), $( ) and backticks run in a child shell: a cd inside ends with it (KWB-117)
    const opens = t.op === '(' || t.op === '$(' || (t.op === '`' && !ticked);
    const closes = t.op === ')' || (t.op === '`' && ticked);
    if (opens || closes) {
      flush();
      pipeIn = null;
      if (t.op === '`') ticked = opens;
      if (opens) folders.push(here);
      else if (folders.length) here = folders.pop();
      continue;
    }
    if (t.op === '|') { flush(); continue; } // the next command reads this one's output
    flush();
    pipeIn = null;
  }
  flush();
  return writes;
}

let gnuSed;
function findGnuSed() {
  if (gnuSed !== undefined) return gnuSed;
  for (const s of ['/opt/homebrew/opt/gnu-sed/libexec/gnubin/sed', '/usr/local/opt/gnu-sed/libexec/gnubin/sed', 'gsed', 'sed']) {
    const r = spawnSync(s, ['--version'], { encoding: 'utf8', timeout: 2000 });
    if (r.status === 0 && /GNU sed/.test(r.stdout)) return (gnuSed = s);
  }
  return (gnuSed = null);
}

export function afterText(w, before = readText(w.path) ?? '') {
  switch (w.op) {
    case 'write': case 'copy': case 'move': case 'truncate': return { before, after: w.content };
    case 'append': return { before, after: w.content === null ? null : before + w.content };
    case 'touch': return { before, after: before };
    case 'edit': {
      const sed = w.sed && findGnuSed();
      if (!sed) return { before, after: null };
      const r = spawnSync(sed, ['--sandbox', ...w.sed.flags, ...w.sed.scripts.flatMap((s) => ['-e', s])], { input: before, encoding: 'utf8', timeout: 3000 });
      return { before, after: r.status === 0 ? r.stdout : null };
    }
    default: return { before, after: null };
  }
}

const direct = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (direct && process.argv.includes('--selftest')) import('./shell-writes-selftest.mjs').then((m) => { process.exitCode = m.selftest(); });
if (process.argv[1] && process.argv.includes('--json') && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  let raw = '';
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => {
    let q = {};
    try { q = JSON.parse(raw || '{}'); } catch { /* nothing to read */ }
    const out = shellWrites(q.command ?? '', q.cwd ?? process.cwd()).map((w) => ({ path: w.path, op: w.op, ...afterText(w) }));
    process.stdout.write(JSON.stringify(out));
  });
}
