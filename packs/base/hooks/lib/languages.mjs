// One row per language, for the statement reader (0.25.0: every language, because AI writes the same thing over and over). A row says how
// to blank a file's comments and strings, where a statement ends, what is not code, and how a function is defined. A new language is one row.
//   languageOf(ext) -> the row, or null                 ALL_CODE: every extension the table reads
import { blankCode } from './cpp-scan.mjs';
import { blankRust, withoutTests } from './rust-scan.mjs';

const spaces = (s) => s.replace(/[^\n]/g, ' ');

// A blanker for a language with no blanker of its own: comments go, strings keep their quotes so they stay one token, at the same offsets.
function blanker({ line = [], block = [], quotes = ['"', "'"], raw = [], hashWord = false, heredoc = false }) {
  const opener = (src, i) => raw.find((q) => src.startsWith(q, i));
  return (src) => {
    let out = '';
    let i = 0;
    const skipTo = (stop, keepQuotes) => {
      const body = src.slice(i, stop);
      out += keepQuotes && body.length >= 2 ? `"${spaces(body.slice(1, -1))}"` : spaces(body);
      i = stop;
    };
    while (i < src.length) {
      const here = src[i];
      const pair = block.find(([a]) => src.startsWith(a, i));
      const atWord = !hashWord || i === 0 || /\s/.test(src[i - 1]);
      const q = opener(src, i);
      const doc = heredoc && src.startsWith('<<', i) ? src.slice(i).match(/^<<-?\s*['"]?([A-Za-z_]\w*)['"]?[^\n]*\n/) : null;
      if (pair) { const e = src.indexOf(pair[1], i + pair[0].length); skipTo(e === -1 ? src.length : e + pair[1].length, false); }
      else if (line.some((c) => src.startsWith(c, i)) && atWord) { const e = src.indexOf('\n', i); skipTo(e === -1 ? src.length : e, false); }
      else if (q) { const e = src.indexOf(q, i + q.length); skipTo(e === -1 ? src.length : e + q.length, true); }
      else if (doc) {
        const end = src.slice(i).search(new RegExp(`\\n[ \\t]*${doc[1]}[ \\t]*(?:\\n|$)`));
        out += src.slice(i, i + doc[0].length); i += doc[0].length;
        skipTo(end === -1 ? src.length : src.indexOf('\n', i + end - doc[0].length + 1), false);
      } else if (quotes.includes(here)) {
        let j = i + 1;
        while (j < src.length && src[j] !== here && (src[j] !== '\n' || heredoc)) j += src[j] === '\\' ? 2 : 1;
        skipTo(Math.min(j + 1, src.length), true);
      } else { out += here; i += 1; }
    }
    return out;
  };
}

const SLASHES = { line: ['//'], block: [['/*', '*/']] };
const lineStart = (words) => new RegExp(`^[ \\t]*(?:${words})\\b.*$`, 'gm');

export const LANGUAGES = [
  { name: 'c', exts: ['.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.mm'], blank: blankCode, notCode: /^[ \t]*(?:#(?:.*\\\n)*.*|using\b.*)$/gm, minTokens: 60,
    define: /^(?:[A-Za-z_][\w:<>,*& ]*[\s*&])?([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:const\s*)?(?:noexcept\s*)?\{/gm },
  { name: 'js', exts: ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.mts', '.cts'], blank: blankCode, lines: true, notCode: /^[ \t]*import\b[^;]*;?$/gm, minTokens: 60,
    define: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?\s+([A-Za-z_$][\w$]*)|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|class\s+([A-Za-z_$][\w$]*))/gm },
  { name: 'python', exts: ['.py', '.pyi'], blank: blanker({ line: ['#'], raw: ['"""', "'''"] }), lines: true, braces: false, notCode: /^[ \t]*(?:from\s+\S+\s+)?import\b.*$/gm, minTokens: 45,
    define: /^(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)/gm },
  { name: 'shell', exts: ['.sh', '.bash', '.zsh', '.ksh'], blank: blanker({ line: ['#'], hashWord: true, heredoc: true }), lines: true, commands: true, minTokens: 30,
    token: /"\s*"|'\s*'|[^\s;|&()<>{}]+|[;|&()<>{}]/g, notCode: /^[ \t]*(?:\.|source|set|shopt|trap|cd)\s.*$/gm, define: /^(?:function\s+)?([A-Za-z_][\w-]*)\s*(?:\(\s*\))?\s*\{/gm },
  { name: 'go', exts: ['.go'], blank: blanker({ ...SLASHES, raw: ['`'] }), lines: true, notCode: /^(?:package\b.*|import\s*\([^)]*\)|import\b.*)$/gm, minTokens: 50, define: /^func\s+([A-Za-z_]\w*)/gm },
  { name: 'rust', exts: ['.rs'], blank: blankRust, withoutTests, notCode: lineStart('use|mod|extern|pub use'), minTokens: 60,
    define: /^[ \t]*(?:pub(?:\([^)]*\))?\s+)?(?:default\s+)?(?:const\s+)?(?:async\s+)?(?:unsafe\s+)?(?:extern\s+"[^"]*"\s+)?fn\s+([A-Za-z_]\w*)/gm },
  { name: 'java', exts: ['.java', '.cs', '.scala', '.dart'], blank: blanker(SLASHES), notCode: lineStart('import|package|using|namespace'), minTokens: 60,
    define: /^[ \t]*(?:public|private|protected|internal|static|final|async|override|virtual|\s)+[\w<>[\],\s]+\s([A-Za-z_]\w*)\s*\([^;{}]*\)\s*(?:throws [\w, ]+)?\s*\{/gm },
  { name: 'kotlin', exts: ['.kt', '.kts', '.swift'], blank: blanker({ ...SLASHES, raw: ['"""'] }), lines: true, notCode: lineStart('import|package'), minTokens: 50, define: /^(?:(?:public|private|internal)\s+)?(?:fun|func)\s+([A-Za-z_]\w*)/gm },
  { name: 'ruby', exts: ['.rb', '.rake'], blank: blanker({ line: ['#'], block: [['=begin', '=end']] }), lines: true, notCode: lineStart('require|require_relative|include'), minTokens: 45, define: /^\s*def\s+(?:self\.)?([A-Za-z_]\w*[?!]?)/gm },
  { name: 'php', exts: ['.php'], blank: blanker({ line: ['//', '#'], block: [['/*', '*/']] }), notCode: lineStart('use|namespace|require|include'), minTokens: 60, define: /^\s*(?:public\s+|private\s+|protected\s+|static\s+)*function\s+([A-Za-z_]\w*)/gm },
  { name: 'lua', exts: ['.lua'], blank: blanker({ line: ['--'], block: [['--[[', ']]']] }), lines: true, notCode: /^$^/gm, minTokens: 45, define: /^(?:local\s+)?function\s+([A-Za-z_][\w.:]*)/gm },
];

const BY_EXT = new Map(LANGUAGES.flatMap((l) => l.exts.map((e) => [e, l])));
export const languageOf = (ext) => BY_EXT.get(ext) ?? null;
export const languageNamed = (name) => LANGUAGES.find((l) => l.name === name) ?? null;
export const ALL_CODE = new Set(BY_EXT.keys());
