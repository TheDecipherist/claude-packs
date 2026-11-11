// shell-writes: the files a shell command writes, and what it writes into them where that can be known.
// Every guard that refuses a write judges the shell's writes through this, so no guard has a route the
// Write tool lacks (WB-69: a guard covered Write and Edit while `cat > file <<EOF` walked past it).
//
//   shellWrites(command, cwd, env) -> [{ path, op, content, from?, sed? }]
//     env: the variables a path may start with ($HOME, ~, $NAME), passed by the caller; the module reads none itself.
//     op: write (>, >|, &>, tee), append (>>, &>>, tee -a), copy (cp, install, rsync), move (mv; its source
//         is a delete), link (ln), edit (sed -i, perl -i, ruby -i), truncate, touch, delete (rm, unlink, shred, mv's source)
//     and an inline program's own writes (python -c / python - <<EOF, node -e, perl -e, ruby -e: program-writes.mjs,
//         KWB-8); a script file run by an interpreter (python3 tools/x.py) is the project's own tool, not a write.
//     content: the text written (an echo or printf, a heredoc or here-string, a cat of known files, what a pipe
//         carries into tee, the source of a cp or mv), or null when it cannot be known.
//   afterText(write) -> { before, after }   after is null when it cannot be known; sed -i is run for real on a
//         copy of the text, in GNU sed's --sandbox (no e, r or w commands), so its result is exact (shell-sed.mjs).
//   `node shell-writes.mjs --json` reads { command, cwd } on stdin and prints the writes with before and after
//   (the python hooks use this, so there is one reader of the shell). `--selftest`: each route and program form.
// Text inside quotes, and a heredoc's body, is never read as a command.
import { realpathSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bareWords } from './command-prefix.mts';
import { isDir, readText } from './files.mts';
import { parseJson } from './json.mts';
import { programOf, programWrites } from './program-writes.mts';
import { cutHeredocs, lex } from './shell-lex.mts';
import type { Token } from './shell-lex.mts';
import { inPlaceFiles, runSed, sedPlan } from './shell-sed.mts';
import type { SedPlan } from './shell-sed.mts';
import type { WriteOp } from './types.d.mts';

export { readText };   // its importers' name for the file reader; files.mts owns it

/** The variables a path may start with, as the caller read them from its process. */
import type { Env } from './types.d.mts';
export type { Env };

/** One file a shell command writes; `content` is the new text where it can be known, else null. */
export interface ShellWrite {
  path: string;
  op: WriteOp;
  content: string | null;
  from?: string;
  /** Set on an `edit` by sed; null when the script comes from a file (-f), which is not read. */
  sed?: SedPlan | null;
}

/** A redirection on a simple command: its operator, descriptor, file word, or heredoc number. */
interface Redirect {
  op: string;
  fd?: string | undefined;
  target?: string;
  doc?: number | undefined;
}

interface Simple {
  words: string[];
  redirs: Redirect[];
}

/** The text `afterText` gives for one write. */
export interface TextChange {
  before: string;
  after: string | null;
}

type Adder = (path: string, op: WriteOp, content: string | null, extra?: Partial<ShellWrite>) => void;

const NOT_FILES: ReadonlySet<string> = new Set(['/dev/null', '/dev/stdout', '/dev/stderr', '/dev/tty']);
const REDIRECTS: readonly string[] = ['>', '>>', '>|', '&>', '&>>'];

// A path that starts with a variable is where that variable points, never a folder of this name in the project (KWB-44). One not set is somewhere unknown.
const expand = (p: string, env: Env): string => p
  .replace(/^(~|\$HOME|\$\{HOME\})(?=\/|$)/, env.HOME ?? '')
  .replace(/^\$\{?([A-Za-z_]\w*)\}?(?=\/|$)/, (_m, name: string) => env[name] ?? `/unresolved-${name}`);

function printf(args: readonly string[]): string {
  const [fmt, ...vals] = args;
  if (fmt === undefined) return '';
  const esc = (s: string): string => s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
  const slots = (fmt.match(/%[sdbq]/g) ?? []).length;
  if (!slots) return esc(fmt);
  let out = '';
  let k = 0;
  do {
    out += esc(fmt).replace(/%[sdbq]/g, () => vals[k++] ?? '');
  } while (k < vals.length);
  return out;
}

// What a cp, mv, install, rsync or ln call makes.
function copies(exe: string, args: readonly string[], plain: readonly string[], at: (p: string) => string, add: Adder): void {
  const t = args.findIndex((a) => a === '-t' || a === '--target-directory');
  const dirArg = t >= 0 ? (args[t + 1] ?? null) : null;
  const files = plain.filter((a) => a !== dirArg && !(exe === 'install' && /^\d{3,4}$/.test(a)));
  const srcs = dirArg ? files : files.slice(0, -1);
  const dest = dirArg ?? files.at(-1);
  if (!dest || !srcs.length) return;
  for (const s of srcs) {
    const into = dirArg || srcs.length > 1 || dest.endsWith('/') || isDir(at(dest));
    const target = into ? join(at(dest), basename(s)) : at(dest);
    const op: WriteOp = exe === 'mv' ? 'move' : exe === 'ln' ? 'link' : 'copy';
    add(target, op, exe === 'ln' ? null : readText(at(s)), { from: at(s) });
    if (exe === 'mv') add(at(s), 'delete', null);
  }
}

// One simple command: its words, redirections and stdin, and what it writes.
function judge(cmd: Simple, cwd: string, stdin: string | null, writes: ShellWrite[], bodies: readonly string[], env: Env): { stdout: string | null; cd: string | null } {
  const words = bareWords(cmd.words);
  const at = (p: string): string => resolve(cwd, expand(p, env));
  let input = stdin;
  for (const r of cmd.redirs) {
    if (r.op === '<<') input = r.doc === undefined ? null : (bodies[r.doc] ?? null);
    else if (r.op === '<<<') input = `${r.target ?? ''}\n`;
    else if (r.op === '<') input = r.target === undefined ? null : readText(at(r.target));
  }
  const exe = words.length ? basename(words[0] ?? '') : '';
  const args = words.slice(1);
  const flags = args.filter((a) => a.startsWith('-'));
  const plain = args.filter((a) => !a.startsWith('-'));
  let stdout: string | null = null;
  if (exe === 'echo') {
    const n = args[0] === '-n' || args[0] === '-ne' || args[0] === '-en';
    const e = /^-[ne]*e/.test(args[0] ?? '');
    const text = args.filter((a, k) => !(k === 0 && /^-[neE]+$/.test(a))).join(' ');
    stdout = (e ? text.replace(/\\n/g, '\n').replace(/\\t/g, '\t') : text) + (n ? '' : '\n');
  } else if (exe === 'printf') stdout = printf(args);
  else if (exe === 'cat') stdout = plain.length ? plain.map((f) => readText(at(f))).reduce<string | null>((a, b) => (a === null || b === null ? null : a + b), '') : input;
  else if (exe === 'tee') stdout = input;
  else if (exe === '' && cmd.redirs.some((r) => r.op === '<<' || r.op === '<<<')) stdout = input;
  else if (exe === ':' || exe === 'true') stdout = '';

  const add: Adder = (path, op, content, extra = {}) => { if (!NOT_FILES.has(path)) writes.push({ path, op, content, ...extra }); };
  for (const r of cmd.redirs) {
    if (!REDIRECTS.includes(r.op) || !r.target) continue;
    const toStdout = r.fd === '' || r.fd === '1' || r.op.startsWith('&');
    add(at(r.target), r.op.includes('>>') ? 'append' : 'write', toStdout ? stdout : null);
  }
  if (exe === 'tee') for (const f of plain) add(at(f), flags.some((x) => /^-\w*a/.test(x) || x === '--append') ? 'append' : 'write', input);
  if (['cp', 'mv', 'install', 'rsync', 'ln'].includes(exe)) copies(exe, args, plain, at, add);
  if (exe === 'sed' && args.some((a) => a === '-i' || a.startsWith('-i') || a.startsWith('--in-place'))) {
    const { plan, files } = sedPlan(args);
    for (const f of files) add(at(f), 'edit', null, { sed: plan });
  }
  if ((exe === 'perl' || exe === 'ruby') && args.some((a) => /^-\w*i/.test(a))) for (const f of inPlaceFiles(args)) add(at(f), 'edit', null);
  const program = programOf(exe, args, input);
  if (program) for (const w of programWrites(program, at, readText, env.HOME ?? '')) add(w.path, w.op, w.content, w.from ? { from: w.from } : {});
  if (exe === 'dd') for (const a of args) if (a.startsWith('of=')) add(at(a.slice(3)), 'write', null);
  if (exe === 'truncate') {
    const k = args.findIndex((a) => a === '-s' || a.startsWith('--size'));
    const flag = k >= 0 ? (args[k] ?? '') : '';
    const size = k >= 0 ? (flag.includes('=') ? flag.split('=')[1] : args[k + 1]) : null;
    for (const f of plain.filter((a) => a !== size)) add(at(f), 'truncate', size === '0' ? '' : null);
  }
  if (exe === 'touch') for (const f of plain) add(at(f), 'touch', null);
  if (['rm', 'unlink', 'shred'].includes(exe)) for (const f of plain) add(at(f), 'delete', null);
  const first = plain[0];
  return { stdout, cd: exe === 'cd' && first ? at(first) : null };
}

/** Every file the command writes, in the order it writes them; `cwd` is where it starts, `env` what its variables mean. */
export function shellWrites(command: string, cwd: string, env: Env): ShellWrite[] {
  const { text, bodies } = cutHeredocs(command);
  const writes: ShellWrite[] = [];
  let here = cwd;
  const folders: string[] = [];   // the folder each open child shell started in (KWB-118)
  let ticked = false;   // inside a backtick substitution
  let cmd: Simple = { words: [], redirs: [] };
  let pipeIn: string | null = null;
  const tokens = lex(text);
  // a variable set earlier in the command ("S=/tmp/x; cat > $S/a.md") names that folder, not "<cwd>/$S" (KWB-18); one never set
  // stays as written
  const vars: Record<string, string> = {};
  const sub = (w: string): string => w.replace(/\$(?:\{(\w+)\}|(\w+))/g, (m, a: string | undefined, b: string | undefined) => vars[a ?? b ?? ''] ?? m);
  const flush = (): void => {
    if (cmd.words.length && !cmd.redirs.length && cmd.words.every((w) => /^[A-Za-z_]\w*=/.test(w))) {
      for (const w of cmd.words) { const i = w.indexOf('='); vars[w.slice(0, i)] = sub(w.slice(i + 1)); }
      cmd = { words: [], redirs: [] };
      pipeIn = null;
      return;
    }
    cmd = { words: cmd.words.map(sub), redirs: cmd.redirs.map((r) => (r.target === undefined ? r : { ...r, target: sub(r.target) })) };
    if (cmd.words.length || cmd.redirs.length) {
      const r = judge(cmd, here, pipeIn, writes, bodies, env);
      if (r.cd) here = r.cd;
      pipeIn = r.stdout;
    } else pipeIn = null;
    cmd = { words: [], redirs: [] };
  };
  for (let k = 0; k < tokens.length; k += 1) {
    const t: Token | undefined = tokens[k];
    if (!t) continue;
    if ('w' in t) { cmd.words.push(t.w); continue; }
    if (['>', '>>', '>|', '&>', '&>>', '<', '<<<'].includes(t.op)) {
      const next = tokens[k + 1];
      if (next && 'w' in next) { cmd.redirs.push({ op: t.op, fd: t.fd, target: next.w }); k += 1; }
      continue;
    }
    if (t.op === '<<') { cmd.redirs.push({ op: '<<', doc: t.doc }); continue; }
    if (t.op === '>&') continue;
    // ( ), $( ) and backticks run in a child shell: a cd inside ends with it (KWB-118)
    const opens: boolean = t.op === '(' || t.op === '$(' || (t.op === '`' && !ticked);
    const closes: boolean = t.op === ')' || (t.op === '`' && ticked);
    if (opens || closes) {
      flush();
      pipeIn = null;
      if (t.op === '`') ticked = opens;
      if (opens) folders.push(here);
      else if (folders.length) here = folders.pop() ?? here;
      continue;
    }
    if (t.op === '|') { flush(); continue; } // the next command reads this one's output
    flush();
    pipeIn = null;
  }
  flush();
  return writes;
}

/** A write's text before and after; `after` is null where it cannot be known. */
export function afterText(w: ShellWrite, before: string = readText(w.path) ?? ''): TextChange {
  switch (w.op) {
    case 'write': case 'copy': case 'move': case 'truncate': return { before, after: w.content };
    case 'append': return { before, after: w.content === null ? null : before + w.content };
    case 'touch': return { before, after: before };
    case 'edit': return { before, after: w.sed ? runSed(w.sed, before) : null };
    default: return { before, after: null };
  }
}

// True when this module is the program node was started with (never when a hook runner or another module imports it).
const real = (p: string): string => { try { return realpathSync(p); } catch { return resolve(p); } };
const isMain = (url: string): boolean => {
  const argv1 = process.argv[1];
  return argv1 !== undefined && real(argv1) === real(fileURLToPath(url));
};

// What the `--json` tail was asked: the command and the folder it ran in.
const asked = (raw: string): { command: string; cwd: string | null } => {
  const q = parseJson(raw || '{}', null);
  const o = q !== null && typeof q === 'object' && !Array.isArray(q) ? (q as Record<string, unknown>) : {};
  return { command: typeof o.command === 'string' ? o.command : '', cwd: typeof o.cwd === 'string' ? o.cwd : null };
};

if (isMain(import.meta.url)) {
  if (process.argv.includes('--selftest')) {
    import('./shell-writes-selftest.mts').then((m) => { process.exitCode = m.selftest(); });
  } else if (process.argv.includes('--json')) {
    let raw = '';
    process.stdin.on('data', (c) => { raw += c; });
    process.stdin.on('end', () => {
      const q = asked(raw);
      const out = shellWrites(q.command, q.cwd ?? process.cwd(), process.env).map((w) => ({ path: w.path, op: w.op, ...afterText(w) }));
      process.stdout.write(JSON.stringify(out));
    });
  }
}
