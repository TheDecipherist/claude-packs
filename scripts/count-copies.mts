// The copies W4 takes out, counted (typescript order W4's Done when; the repeats survey's owner table): each kind of hand copy the
// surveys listed, how many there were, how many are left, and where. A kind's owner is the one place it may stay.
//   node scripts/count-copies.mts [--dir <kit>]      prints the table and each copy left; exit 1 when a copy is left outside an owner
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitLines } from '../packs/base/hooks/lib/git-run.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';

/** One kind of copy: the lines that are one, the files it is looked for in, and the survey's count and the order's target. */
export interface CopyKind {
  name: string;
  /** A line that is a copy. */
  line: RegExp;
  /** The files it is looked for in (all the kit's sources when absent). */
  inFiles?: RegExp;
  /** The owner's own lines, which are the one copy kept. */
  owner?: RegExp;
  before: number;
  target: number;
}

const GIT_SPAWN = String.raw`(?:execFileSync|spawnSync|execSync|execFile|spawn)\(\s*['"]git['"]`;
const FUNCTION_HEAD = String.raw`function\s+\w+\s*\([^)]*\)[^{\n]*\{`;
const ARROW_HEAD = String.raw`const\s+\w+\s*=\s*(?:\([^)]*\)|\w+)\s*(?::[^=\n]+)?=>\s*\{?`;
/** The body's first statement: on the head's line or the next, perhaps a return. */
const BODY_START = String.raw`\s*(?:\n\s*)?(?:return\s+)?`;
const HOOK_FILE = /^(?:packs\/[^/]+\/hooks\/[^/]+|global\/hooks\/[^/]+|\.claude\/hooks\/kit-lock)\.mts$/;

export const KINDS: readonly CopyKind[] = [
  // a function that is a git runner: its body is the spawn (on its line, or the next one's first statement), not a builder
  // that runs git among other things
  { name: 'git runners (definitions)', line: new RegExp(`(?:${FUNCTION_HEAD}|${ARROW_HEAD})${BODY_START}${GIT_SPAWN}`), owner: /^packs\/base\/hooks\/lib\/git-run\.mts$/, before: 22, target: 1 },
  { name: 'payload parses by hand', line: /=\s*JSON\.parse\(\s*(?:text|input|raw|stdin|payloadText)\s*\)/, inFiles: HOOK_FILE, before: 22, target: 0 },
  // a hook's tail; a test that writes an old-style hook as a sample, to prove the runner still runs one, is not a hook
  { name: 'hook tails by hand', line: /isMain\(import\.meta\.url\)[^\n]*asHook\(/, inFiles: /^(?!test\/)/, before: 33, target: 0 },
  { name: 'isMain by hand', line: /process\.argv\[1\]\s*===|===\s*(?:real\()?process\.argv\[1\]/, owner: /^packs\/base\/hooks\/lib\/hook-log\.mts$/, before: 11, target: 0 },
  // a heredoc's whole body cut out of a command; global/ cannot import the hooks lib (the order's W4), so it keeps its one owner
  { name: 'heredoc cutting', line: /<<-\?[^\n]*\[\\s\\S\]\*\?/, owner: /^(?:packs\/base\/hooks\/lib\/shell-lex|global\/hooks\/lib\/command-pins)\.mts$/, before: 8, target: 1 },
];

const SOURCE = /\.(?:mts|mjs|cjs|js|py|sh)$/;
const FOLDERS = ['bin', 'lib', 'global', 'scripts', 'packs', '.claude/hooks/kit-lock.mts', 'test'];

// The counter and its test, whose patterns and planted copies are samples of each kind
const SELF = new Set(['scripts/count-copies.mts', 'test/count-copies.test.mts']);

/** The kit's own sources: tracked or new, never ignored (so never an emitted twin), never a fixture copied from a project. */
export function kitSources(root: string, env: Env): string[] {
  const listed = gitLines(['ls-files', '-co', '--exclude-standard', '--', ...FOLDERS], { cwd: root, env });
  return listed.filter((f) => SOURCE.test(f) && !f.startsWith('test/fixtures/') && !SELF.has(f));
}

export interface Hit { file: string; line: number; text: string }
/** A kind's copies left, the number of its owner files present, and the copies by folder. */
export interface Count { kind: CopyKind; hits: Hit[]; owned: number; folders: Record<string, number> }

const folderOf = (file: string): string => (file.startsWith('packs/') ? file.split('/').slice(0, 2).join('/') : file.split('/')[0] ?? file);
const lineAt = (text: string, index: number): number => text.slice(0, index).split('\n').length;

/** Each kind's copies left in `files` (paths relative to `root`); the owner's are counted apart. */
export function countCopies(root: string, files: readonly string[]): Count[] {
  const texts = files.map((file) => ({ file, text: readFileSync(join(root, file), 'utf8') }));
  return KINDS.map((kind) => {
    const hits: Hit[] = [];
    let owned = 0;
    for (const { file, text } of texts) {
      if (kind.inFiles && !kind.inFiles.test(file)) continue;
      if (kind.owner?.test(file)) { owned += 1; continue; }   // the owner file: the one place the kind lives
      const found = [...text.matchAll(new RegExp(kind.line.source, 'g'))];
      for (const m of found) hits.push({ file, line: lineAt(text, m.index), text: (m[0].split('\n')[0] ?? '').trim().slice(0, 120) });
    }
    const folders: Record<string, number> = {};
    for (const h of hits) folders[folderOf(h.file)] = (folders[folderOf(h.file)] ?? 0) + 1;
    return { kind, hits, owned, folders };
  });
}

/** The report: one row per kind (the survey's count, the order's target, the owners' lines, the copies left outside them, by
 *  folder), then every copy left. A copy outside an owner is over: the target is the owner alone. */
export function report(counts: readonly Count[]): { lines: string[]; over: number } {
  const lines = ['| kind | before | target | in its owners | copies left | copies by folder |', '|---|---|---|---|---|---|'];
  let over = 0;
  for (const c of counts) {
    if (c.hits.length) over += 1;
    const folders = Object.entries(c.folders).map(([f, n]) => `${f} ${n}`).join(', ') || '-';
    lines.push(`| ${c.kind.name} | ${c.kind.before} | ${c.kind.target} | ${c.owned} | ${c.hits.length} | ${folders} |`);
  }
  for (const c of counts.filter((x) => x.hits.length)) {
    lines.push('', `${c.kind.name}, left:`);
    for (const h of c.hits) lines.push(`  ${h.file}:${h.line}  ${h.text}`);
  }
  return { lines, over };
}

if (isMain(import.meta.url)) {
  const at = process.argv.indexOf('--dir');
  const root = at >= 0 ? resolve(process.argv[at + 1] ?? '.') : fileURLToPath(new URL('..', import.meta.url));
  const { lines, over } = report(countCopies(root, kitSources(root, process.env)));
  for (const l of lines) console.log(l);
  process.exit(over ? 1 : 0);
}
