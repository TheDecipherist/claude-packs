// heavy-commands: the one table of heavy command forms and their weights (typescript order W8.8 item 4), and the rewrite that puts a
// heavy command of a Bash line through `governed`. A heavy part is routed where it starts a list item or a pipe (`cd x && npm test`,
// `npm test 2>&1 | tail`); a pipe whose heavy part is not first, a command already governed and a light command are left alone, as is
// a line whose shape this reader does not follow (a heredoc, a subshell, a command substitution, braces): left alone is the safe miss.
//   heavyOf(words) -> { kind, want } | 'governed' | null        routeCommand(command, governed) -> the rewritten line, or null
import { basename } from 'node:path';
import { bareWords } from './command-prefix.mts';
import type { JobKind } from './governor-store.mts';

/** A heavy form: what kind of job it is and how many slots it asks for. */
export interface Heavy { kind: JobKind; want: number }

const TEST: Heavy = { kind: 'test', want: 3 };
const BUILD: Heavy = { kind: 'build', want: 4 };
const FUZZ: Heavy = { kind: 'fuzz', want: 3 };
const INSTALL: Heavy = { kind: 'install', want: 2 };
/** The soak and the replay scripts: several clients and a daemon of their own. */
const SOAK: Heavy = { kind: 'other', want: 4 };

const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun']);
const INSTALLS = new Set(['ci', 'install', 'i', 'add']);
const MAKES = new Set(['make', 'gmake', 'ninja', 'xcodebuild']);
const PYTHONS = new Set(['python', 'python3']);
const SOAK_SCRIPT = /(?:^|\/)scripts\/(?:soak|replay)[\w-]*\.m?[jt]s$/;
const TEST_SCRIPT = /(?:^|\/)scripts\/test-changed\.m?[jt]s$/;
const GOVERNED = /(?:^|\/)(?:governed(?:\.m?[jt]s)?|buildq(?:\.m?[jt]s)?)$/;

/** The package manager's script: `npm test`, `npm run test:changed`, `npm run fuzz`, `npm run build`, `npm ci`. */
function packageForm(args: readonly string[]): Heavy | null {
  const [verb = '', script = ''] = args;
  if (verb === 'test' || verb === 't') return TEST;
  if (INSTALLS.has(verb)) return INSTALL;
  if (verb !== 'run' && verb !== 'run-script') return null;
  if (/^test/.test(script)) return TEST;
  if (/^fuzz/.test(script)) return FUZZ;
  if (/^(?:build|compile)/.test(script)) return BUILD;
  if (/^(?:soak|replay)/.test(script)) return SOAK;
  return null;
}

/** `node --test ...`, the kit's changed-tests script, the soak and replay scripts. */
function nodeForm(args: readonly string[]): Heavy | null {
  const script = args.find((a) => !a.startsWith('-')) ?? '';
  if (args.some((a) => a === '--test' || a.startsWith('--test=')) || TEST_SCRIPT.test(script)) return TEST;
  return SOAK_SCRIPT.test(script) ? SOAK : null;
}

/** `go test` (`-fuzz` makes it a fuzzer), `go build`, `go install`. */
function goForm(args: readonly string[]): Heavy | null {
  const [verb = ''] = args;
  if (verb === 'test') return args.some((a) => /^-{1,2}fuzz(?:=|$)/.test(a)) ? FUZZ : TEST;
  return verb === 'build' || verb === 'install' ? BUILD : null;
}

/** Each heavy program by its name: what it is given its arguments. */
const FORMS: ReadonlyMap<string, (args: readonly string[]) => Heavy | null> = new Map<string, (args: readonly string[]) => Heavy | null>([
  ['node', nodeForm],
  ['go', goForm],
  ['cargo', ([verb = '']) => (['test', 't', 'nextest', 'bench'].includes(verb) ? TEST : ['build', 'b'].includes(verb) ? BUILD : null)],
  ['cmake', (args) => (args.includes('--build') ? BUILD : null)],
  ['ctest', () => TEST],
  ['pytest', () => TEST],
  ['swift', ([verb = '']) => (verb === 'test' ? TEST : verb === 'build' ? BUILD : null)],
  ['pip', ([verb = '']) => (verb === 'install' ? INSTALL : null)],
  ['pip3', ([verb = '']) => (verb === 'install' ? INSTALL : null)],
  ['uv', ([verb = '', sub = '']) => (verb === 'sync' || (verb === 'pip' && sub === 'install') ? INSTALL : null)],
]);

// macOS's QoS wrapper and caffeinate, with the options that take a value; the kit's quiet test runner (it runs the command after it).
const TASKPOLICY_VALUED = new Set(['-c', '-t', '-l', '-p', '-g']);
const CAFFEINATE_VALUED = new Set(['-t', '-w']);
const QUIET_TEST = /(?:^|\/)quiet-test\.m?[jt]s$/;

/** The words of the command a line really runs: past assignments, the shell's wrappers, taskpolicy, caffeinate and quiet-test. */
function realWords(words: readonly string[]): string[] {
  let rest = bareWords(words);
  for (let moved = true; moved && rest.length > 0;) {
    moved = false;
    const [head = '', ...tail] = rest;
    const name = basename(head);
    const valued = name === 'taskpolicy' ? TASKPOLICY_VALUED : name === 'caffeinate' ? CAFFEINATE_VALUED : null;
    if (valued !== null) {
      let i = 0;
      while (i < tail.length && (tail[i] ?? '').startsWith('-')) i += valued.has(tail[i] ?? '') ? 2 : 1;
      rest = bareWords(tail.slice(i));
      moved = true;
    } else if (name === 'node' && QUIET_TEST.test(tail[0] ?? '')) {
      rest = bareWords(tail.slice(1));
      moved = true;
    }
  }
  return rest;
}

/** What a command's words are: a heavy form, a command already governed (or one that takes its own grant, buildq), or null. */
export function heavyOf(words: readonly string[]): Heavy | 'governed' | null {
  if (words.includes('sudo')) return null;
  const real = realWords(words);
  const [head = '', ...args] = real;
  if (GOVERNED.test(head) || (basename(head) === 'node' && GOVERNED.test(args[0] ?? ''))) return 'governed';
  const name = basename(head);
  if (PACKAGE_MANAGERS.has(name)) return packageForm(args);
  if (MAKES.has(name)) return BUILD;
  if (PYTHONS.has(name) && args[0] === '-m' && args[1] === 'pytest') return TEST;
  return FORMS.get(name)?.(args) ?? null;
}

/** One list item or pipe stage of a line: where it starts, its text, and whether it reads a pipe (a stage after the first). */
export interface Segment { start: number; text: string; piped: boolean }

const PAST_READING = /[(){}`]|\$\(|<</;

/** The line's segments by its top-level operators (`&&`, `||`, `;`, `|`, `&`, a newline), quotes kept whole; null when the line holds
 *  a shape this reader does not follow. */
export function segmentsOf(command: string): Segment[] | null {
  const out: Segment[] = [];
  let start = 0;
  let piped = false;
  const cut = (end: number, next: number, pipe: boolean): void => {
    const text = command.slice(start, end);
    const lead = text.length - text.trimStart().length;
    if (text.trim() !== '') out.push({ start: start + lead, text: text.trim(), piped });
    start = next;
    piped = pipe;
  };
  for (let i = 0; i < command.length; i += 1) {
    const c = command[i] ?? '';
    const next = command[i + 1] ?? '';
    if (c === '\\') { i += 1; continue; }
    if (c === "'") { const end = command.indexOf("'", i + 1); if (end < 0) return null; i = end; continue; }
    if (c === '"') {
      let j = i + 1;
      for (; j < command.length && command[j] !== '"'; j += 1) {
        if (command[j] === '\\') j += 1;
        else if (command[j] === '`' || (command[j] === '$' && command[j + 1] === '(')) return null;
      }
      if (j >= command.length) return null;
      i = j;
      continue;
    }
    if (PAST_READING.test(c + next) || PAST_READING.test(c)) return null;
    if (c === '#' && (i === 0 || /\s/.test(command[i - 1] ?? ''))) { const nl = command.indexOf('\n', i); if (nl < 0) break; i = nl - 1; continue; }
    const prev = command[i - 1] ?? '';
    if ((c === '&' && next === '&') || (c === '|' && next === '|')) { cut(i, i + 2, false); i += 1; }
    else if (c === '|') { cut(i, i + (next === '&' ? 2 : 1), true); if (next === '&') i += 1; }
    else if (c === ';' || c === '\n') cut(i, i + 1, false);
    else if (c === '&' && prev !== '>' && prev !== '<' && next !== '>') cut(i, i + 1, false);
  }
  cut(command.length, command.length, false);
  return out;
}

const WORD = /(?:[^\s'"\\]|\\.|'[^']*'|"(?:\\.|[^"\\])*")+/g;
const REDIRECT = /^\d*(?:[<>]|&>)/;
const unquote = (word: string): string => word.replace(/'([^']*)'|"((?:\\.|[^"\\])*)"|\\(.)/g, (_m, a: string | undefined, b: string | undefined, c: string | undefined) => a ?? b ?? c ?? '');
// shell builtins and keywords: governed goes after them, since it cannot run them
const BUILTINS = new Set(['exec', 'command', 'builtin', 'time', '!']);
const ASSIGNMENT = /^[A-Za-z_]\w*=/;

/** A segment's words, unquoted, with redirections left out, each with its offset in the segment. */
function wordsOf(text: string): { word: string; at: number }[] {
  const out: { word: string; at: number }[] = [];
  let skipNext = false;
  for (const m of text.matchAll(WORD)) {
    if (skipNext) { skipNext = false; continue; }
    if (REDIRECT.test(m[0])) { skipNext = /^\d*(?:[<>]{1,2}|&>)&?$/.test(m[0]); continue; }
    out.push({ word: unquote(m[0]), at: m.index });
  }
  return out;
}

/** The text that starts a governed job: `node '<project>/.claude/tools/governed.mjs' --for KIND --want N --`. */
export const governedPrefix = (tool: string, heavy: Heavy): string => `node '${tool.replace(/'/g, "'\\''")}' --for ${heavy.kind} --want ${heavy.want} -- `;

/** The line with each heavy segment that starts a list item or a pipe put through `governed` (the tool's path), or null when nothing
 *  in it is routed. */
export function routeCommand(command: string, tool: string): string | null {
  const segments = segmentsOf(command);
  if (segments === null) return null;
  const inserts: { at: number; text: string }[] = [];
  for (const segment of segments) {
    if (segment.piped) continue;
    const words = wordsOf(segment.text);
    const heavy = heavyOf(words.map((w) => w.word));
    if (heavy === null || heavy === 'governed') continue;
    const first = words.findIndex((w) => !ASSIGNMENT.test(w.word) && !BUILTINS.has(w.word));
    const at = words[first]?.at;
    if (at === undefined) continue;
    inserts.push({ at: segment.start + at, text: governedPrefix(tool, heavy) });
  }
  if (inserts.length === 0) return null;
  let out = command;
  for (const { at, text } of inserts.reverse()) out = out.slice(0, at) + text + out.slice(at);
  return out;
}
