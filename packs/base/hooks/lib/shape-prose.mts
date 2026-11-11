// shape-prose: what in a line is English, arithmetic or a name, and so names no instance (KF-13, KF-17, KF-20, KF-28, KF-36: 14 of shape-law's 25 refusals on the
// MPX 500 were wrong, on words like these). Each test is narrow on purpose: the same line with the bare form stays refused (test/kf-refusals.test.mjs holds both).
//   blankMessages(line, file) -> line with a sentence in a double-quoted string blanked, same length; a short key ("knob 1") stays
//   isFirstMatch(line, m)    "the first program with this name", "each bank's first program", the words "first program" in quotes
//   isSourceRole(line, m)    a comment quoting a role a source gives: "[MAN] Edit knob 1 selects"
//   isKnownName(role, word, shape)   "EDIT knob", when editKnob is a concept or a listed selector
//   isLongerName(line, end)  "MIDI Program Change": the word starts a longer proper name
//   isSum(before)            "x + 1 == program": the number is an operand, not what is compared
//   isLibraryCall(line, at, shape)   juce::MidiMessage::programChange (1, ...): a library's call, or one on a listed value type
//   declaredAmount(root, name, text, env) a call whose declared first parameter is an amount: turnProgram (int steps, ...)
import { statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gitRun } from './git-run.mts';
import { shortHash } from './hash.mts';
import { languageOf } from './languages.mts';

/** The part of a loaded shape these tests read: each concept's name, selectors and constants as lists of names, and the plain value types. */
export interface ProseShape {
  concepts: Readonly<Record<string, { name: string; selectors: readonly string[]; constants: readonly string[] }>>;
  values?: ReadonlySet<string>;
}

const SENTENCE_WORDS = 3;
const LIBRARIES: ReadonlySet<string> = new Set(['juce', 'std', 'boost', 'absl', 'Qt']);
const AMOUNT = /^(?:steps?|detents?|clicks?|notches|ticks?|amount|delta|by|count|n|offset|increment|distance)$/i;
const SOURCE_FILES = ['*.h', '*.hh', '*.hpp', '*.c', '*.cc', '*.cpp', '*.mm', '*.js', '*.mjs', '*.ts', '*.tsx', '*.py', '*.go', '*.rs', '*.java', '*.cs', '*.swift', '*.kt'];

// A path or a file name names a file, never an instance (KWB-117): a brief listing `docs/screens/om-112-osc1-formant.md`
// hands over a file named for the machine's own page. Each is blanked to the same length, so lines and columns hold.
const PATH = /(?<![\w/])(?:[\w.~@-]*\/)+[\w.@-]+\/?|(?<![\w/])[\w@-]+(?:\.[\w-]+)*\.(?:md|png|jpe?g|gif|webp|svg|pdf|txt|json|csv|ya?ml|html?|wav|bin|rom|syx|mjs|js|ts|tsx|py|cpp|cc|hh?|hpp|cir|log)(?![\w])/g;
export const blankPaths = (text: string): string => text.replace(PATH, (p) => ' '.repeat(p.length));

export function blankMessages(line: string, file: string | null | undefined): string {
  if (!languageOf(extname(file ?? ''))) return line;
  return line.replace(/"(?:[^"\\]|\\.)*"/g, (s) => (s.trim().split(/\s+/).length >= SENTENCE_WORDS ? ' '.repeat(s.length) : s));
}

export function isFirstMatch(line: string, m: RegExpMatchArray): boolean {
  if (!/^first\b/i.test(m[0])) return false;
  const at = m.index ?? 0;
  const before = line.slice(0, at);
  const after = line.slice(at + m[0].length);
  if (before.endsWith('"') && after.startsWith('"')) return true;
  return /(?:'s|\b[Aa]|\b[Ee]ach|\b[Ee]very|\b[Aa]ny)\s+$/.test(before) || /^(?:'s)?\s+(?:with|that|which|whose|where|matching|found|a|an)\b/.test(after);
}

export function isSourceRole(line: string, m: RegExpMatchArray): boolean {
  const at = m.index ?? 0;
  const isComment = /^\s*(?:\/\/|\/\*|\*|#)/.test(line);
  return isComment && /\[[A-Z]{2,6}\]/.test(line.slice(0, at)) && /^\s+[a-z]+s\b/.test(line.slice(at + m[0].length));
}

const named = new WeakMap<object, ReadonlySet<string>>();
function namesOf(shape: ProseShape): ReadonlySet<string> {
  let names = named.get(shape);
  if (!names) {
    names = new Set(Object.values(shape.concepts).flatMap((c) => [c.name, ...c.selectors, ...c.constants]).map((n) => n.toLowerCase()));
    named.set(shape, names);
  }
  return names;
}
export const isKnownName = (role: string, word: string, shape: ProseShape): boolean => namesOf(shape).has(`${role}${word}`.toLowerCase());

export const isLongerName = (line: string, end: number): boolean => /^\s+[A-Z][a-z]/.test(line.slice(end));
export const isSum = (before: string): boolean => /[+\-*/%]\s*$/.test(before);

export function isLibraryCall(line: string, at: number, shape: ProseShape): boolean {
  const head = line.slice(0, at);
  const path = head.match(/([A-Za-z_]\w*)::(?:[A-Za-z_]\w*::)*$/);
  if (!path) return false;
  const last = head.match(/([A-Za-z_]\w*)::$/)?.[1];
  return LIBRARIES.has(path[1] ?? '') || (last !== undefined && Boolean(shape.values?.has(last)));
}

// The first parameter of each declaration of `name`, from the text being written and the project's files. git grep only narrows the
// files: its -E is the system's regex, and macOS's has no \b (KWB-159), so the word boundary is the JS pattern's.
function firstParameters(root: string, name: string, text: string, env: Readonly<Record<string, string | undefined>>): string[] {
  const shape = new RegExp(`\\b${name}\\s*\\(\\s*(?:const\\s+)?(?:[\\w:<>]+[\\s&*]+)+(\\w+)\\s*[,)=]`, 'g');
  // no match, or no repository: nothing declares it, so the call stays an instance
  const grep = gitRun(['grep', '--untracked', '-hE', `${name}[[:space:]]*\\(`, '--', ...SOURCE_FILES], { cwd: root, env, timeoutMs: 5000 });
  const found = grep.ok ? grep.stdout : '';
  return [...`${text}\n${found}`.matchAll(shape)].map((m) => m[1] ?? '');
}

// The answer is kept per project, call and text, and the repository's index file's mtime is in its key: a declaration added
// and staged since is read again (a file never added is not seen until the index moves; git grep reads it, the key does not).
const amounts = new Map<string, boolean>();
const indexMtime = (root: string): number => { try { return statSync(join(root, '.git', 'index')).mtimeMs; } catch { return 0; } };

/** True when every declaration of `name` takes an amount (steps, count, delta...) as its first parameter: the call's number is no instance. */
export function declaredAmount(root: string, name: string, text: string, env: Readonly<Record<string, string | undefined>>): boolean {
  const key = `${root}\0${name}\0${shortHash(text, 12)}\0${indexMtime(root)}`;
  let known = amounts.get(key);
  if (known === undefined) {
    const params = firstParameters(root, name, text, env);
    known = params.length > 0 && params.every((p) => AMOUNT.test(p));
    amounts.set(key, known);
  }
  return known;
}
