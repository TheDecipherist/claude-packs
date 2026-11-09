// shape-prose: what in a line is English, arithmetic or a name, and so names no instance (KF-13, KF-17, KF-20, KF-28, KF-36: 14 of shape-law's 25 refusals on the
// MPX 500 were wrong, on words like these). Each test is narrow on purpose: the same line with the bare form stays refused (test/kf-refusals.test.mjs holds both).
//   blankMessages(line, file) -> line with a sentence in a double-quoted string blanked, same length; a short key ("knob 1") stays
//   isFirstMatch(line, m)    "the first program with this name", "each bank's first program", the words "first program" in quotes
//   isSourceRole(line, m)    a comment quoting a role a source gives: "[MAN] Edit knob 1 selects"
//   isKnownName(role, word, shape)   "EDIT knob", when editKnob is a concept or a listed selector
//   isLongerName(line, end)  "MIDI Program Change": the word starts a longer proper name
//   isSum(before)            "x + 1 == program": the number is an operand, not what is compared
//   isLibraryCall(line, at, shape)   juce::MidiMessage::programChange (1, ...): a library's call, or one on a listed value type
//   declaredAmount(root, name, text) a call whose declared first parameter is an amount: turnProgram (int steps, ...)
import { execFileSync } from 'node:child_process';
import { extname } from 'node:path';
import { languageOf } from './languages.mjs';

const SENTENCE_WORDS = 3;
const LIBRARIES = new Set(['juce', 'std', 'boost', 'absl', 'Qt']);
const AMOUNT = /^(?:steps?|detents?|clicks?|notches|ticks?|amount|delta|by|count|n|offset|increment|distance)$/i;
const SOURCE_FILES = ['*.h', '*.hh', '*.hpp', '*.c', '*.cc', '*.cpp', '*.mm', '*.js', '*.mjs', '*.ts', '*.tsx', '*.py', '*.go', '*.rs', '*.java', '*.cs', '*.swift', '*.kt'];

// A path or a file name names a file, never an instance (KWB-117): a brief listing `docs/screens/om-112-osc1-formant.md`
// hands over a file named for the machine's own page. Each is blanked to the same length, so lines and columns hold.
const PATH = /(?<![\w/])(?:[\w.~@-]*\/)+[\w.@-]+\/?|(?<![\w/])[\w@-]+(?:\.[\w-]+)*\.(?:md|png|jpe?g|gif|webp|svg|pdf|txt|json|csv|ya?ml|html?|wav|bin|rom|syx|mjs|js|ts|tsx|py|cpp|cc|hh?|hpp|cir|log)(?![\w])/g;
export const blankPaths = (text) => text.replace(PATH, (p) => ' '.repeat(p.length));

export function blankMessages(line, file) {
  if (!languageOf(extname(file ?? ''))) return line;
  return line.replace(/"(?:[^"\\]|\\.)*"/g, (s) => (s.trim().split(/\s+/).length >= SENTENCE_WORDS ? ' '.repeat(s.length) : s));
}

export function isFirstMatch(line, m) {
  if (!/^first\b/i.test(m[0])) return false;
  const before = line.slice(0, m.index);
  const after = line.slice(m.index + m[0].length);
  if (before.endsWith('"') && after.startsWith('"')) return true;
  return /(?:'s|\b[Aa]|\b[Ee]ach|\b[Ee]very|\b[Aa]ny)\s+$/.test(before) || /^(?:'s)?\s+(?:with|that|which|whose|where|matching|found|a|an)\b/.test(after);
}

export function isSourceRole(line, m) {
  const isComment = /^\s*(?:\/\/|\/\*|\*|#)/.test(line);
  return isComment && /\[[A-Z]{2,6}\]/.test(line.slice(0, m.index)) && /^\s+[a-z]+s\b/.test(line.slice(m.index + m[0].length));
}

const named = new WeakMap();
function namesOf(shape) {
  if (!named.has(shape)) {
    const rows = Object.values(shape.concepts);
    named.set(shape, new Set(rows.flatMap((c) => [c.name, ...c.selectors, ...c.constants]).map((n) => n.toLowerCase())));
  }
  return named.get(shape);
}
export const isKnownName = (role, word, shape) => namesOf(shape).has(`${role}${word}`.toLowerCase());

export const isLongerName = (line, end) => /^\s+[A-Z][a-z]/.test(line.slice(end));
export const isSum = (before) => /[+\-*/%]\s*$/.test(before);

export function isLibraryCall(line, at, shape) {
  const path = line.slice(0, at).match(/([A-Za-z_]\w*)::(?:[A-Za-z_]\w*::)*$/);
  if (!path) return false;
  const last = line.slice(0, at).match(/([A-Za-z_]\w*)::$/)?.[1];
  return LIBRARIES.has(path[1]) || shape.values?.has(last);
}

// The first parameter of each declaration of `name`, from the text being written and the project's files.
function firstParameters(root, name, text) {
  const shape = new RegExp(`\\b${name}\\s*\\(\\s*(?:const\\s+)?(?:[\\w:<>]+[\\s&*]+)+(\\w+)\\s*[,)=]`, 'g');
  let found = '';
  try {
    found = execFileSync('git', ['-C', root, 'grep', '--untracked', '-hE', `\\b${name}[[:space:]]*\\(`, '--', ...SOURCE_FILES], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
  } catch {
    found = ''; // no match, or no repository: nothing declares it, so the call stays an instance
  }
  return [...`${text}\n${found}`.matchAll(shape)].map((m) => m[1]);
}

const amounts = new Map();
export function declaredAmount(root, name, text) {
  const key = `${root}\0${name}`;
  if (!amounts.has(key)) {
    const params = firstParameters(root, name, text);
    amounts.set(key, params.length > 0 && params.every((p) => AMOUNT.test(p)));
  }
  return amounts.get(key);
}
