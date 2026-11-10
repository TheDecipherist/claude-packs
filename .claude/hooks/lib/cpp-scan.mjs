// Minimal C++ scanner: blanks comments and string/char literals (keeping offsets and
// newlines intact), then finds audio-thread function definitions and their bodies.

export const AUDIO_FUNCTIONS = new Set([
  'processBlock',
  'processBlockBypassed',
  'renderNextBlock',
  'processSample',
]);

const NOT_FUNCTIONS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'sizeof', 'alignof', 'decltype']);

// Text allowed between a definition's ")" and its "{": qualifiers, trailing return type, attributes.
// Parentheses are not allowed (except `noexcept(...)`, stripped first), so a call inside
// `if (x.processSample (s)) {` is never mistaken for a definition.
const TRAILER = /^[\s\w:<>,&*\[\]\-]*$/;
const NOEXCEPT_ARG = /noexcept\s*\([^()]*\)/g;

// keepStrings: blank comments only, so a check can read string literals in code but not prose
export function blankCode(src, keepStrings = false) {
  let out = '';
  let i = 0;
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === '//') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? src.length : end;
      out += blank(src.slice(i, stop));
      i = stop;
    } else if (two === '/*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += blank(src.slice(i, stop));
      i = stop;
    } else if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
      // A string is walked either way, so a // inside one is no comment. A template string can span lines and stays as written.
      const q = src[i];
      let j = i + 1;
      while (j < src.length && src[j] !== q && (src[j] !== '\n' || q === '`')) j += src[j] === '\\' ? 2 : 1;
      const inner = src.slice(i + 1, j);
      out += q + (keepStrings || q === '`' ? inner : blank(inner)) + (j < src.length ? src[j] : '');
      i = j + 1;
    } else {
      out += src[i];
      i += 1;
    }
  }
  return out;
}

function matchClose(code, openIdx, open, close) {
  let depth = 0;
  for (let i = openIdx; i < code.length; i += 1) {
    if (code[i] === open) depth += 1;
    else if (code[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// Returns [{ name, start, end }] where start..end is the body including braces.
export function findAudioBodies(code) {
  const bodies = [];
  const nameRe = /\b([A-Za-z_]\w*)\s*\(/g;
  let m;
  while ((m = nameRe.exec(code)) !== null) {
    const name = m[1];
    if (NOT_FUNCTIONS.has(name)) continue;
    const parenOpen = m.index + m[0].length - 1;
    const parenClose = matchClose(code, parenOpen, '(', ')');
    if (parenClose === -1) continue;
    const brace = code.indexOf('{', parenClose);
    const semi = code.indexOf(';', parenClose);
    if (brace === -1 || (semi !== -1 && semi < brace)) continue;
    const trailer = code.slice(parenClose + 1, brace).replace(NOEXCEPT_ARG, 'noexcept');
    if (!TRAILER.test(trailer)) continue;
    const isAudio = AUDIO_FUNCTIONS.has(name) || /\bnonblocking\b/.test(trailer);
    if (!isAudio) continue;
    const end = matchClose(code, brace, '{', '}');
    if (end === -1) continue;
    bodies.push({ name, start: brace, end });
    nameRe.lastIndex = end;
  }
  return bodies;
}

export function lineAt(src, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) if (src[i] === '\n') line += 1;
  return line;
}
