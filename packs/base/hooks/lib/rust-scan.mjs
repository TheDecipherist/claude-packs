// Rust's own reading (KWB-75). C's blanker takes a lifetime for a char literal and blanks the rest of its line, and a generic blanker takes '"' for a
// string opening. Nested block comments and raw strings have no form in either. Offsets are kept, so a match's line is the file's line.
//   blankRust(src)      comments go; a string or char literal keeps two quotes, so it stays one token
//   withoutTests(code)  on blanked code: what `#[cfg(test)]` or a `#[test]` attribute marks goes too, since Rust's unit tests live in the file they test
const spaces = (s) => s.replace(/[^\n]/g, ' ');
const quoted = (s) => (s.length >= 2 ? `"${spaces(s.slice(1, -1))}"` : spaces(s));

function commentEnd(src, start) {
  let depth = 1;
  let i = start + 2;
  while (i < src.length && depth > 0) {
    if (src.startsWith('/*', i)) { depth += 1; i += 2; }
    else if (src.startsWith('*/', i)) { depth -= 1; i += 2; }
    else i += 1;
  }
  return i;
}

function stringEnd(src, start) {
  let i = start + 1;
  while (i < src.length && src[i] !== '"') i += src[i] === '\\' ? 2 : 1;
  return Math.min(i + 1, src.length);
}

// r"..", r#".."#, br#".."#, cr#".."#: nothing inside escapes, and the hashes close it. Returns where the opening quote is, and the end, or null.
function rawString(src, i) {
  if (/\w/.test(src[i - 1] ?? '')) return null;
  const open = src.slice(i, i + 80).match(/^(?:b|c)?r(#*)"/);
  if (!open) return null;
  const close = src.indexOf(`"${open[1]}`, i + open[0].length);
  return { quote: i + open[0].length - 1, end: close === -1 ? src.length : close + 1 + open[1].length };
}

// A quote opens a char literal only when one character, or one escape, then closes it; otherwise it is a lifetime or a label.
function charEnd(src, i) {
  if (src[i + 1] === '\\') { const e = src.indexOf("'", i + 3); return e === -1 ? null : e + 1; }
  const one = String.fromCodePoint(src.codePointAt(i + 1) ?? 32);
  return src[i + 1 + one.length] === "'" ? i + 2 + one.length : null;
}

export function blankRust(src) {
  let out = '';
  let i = 0;
  const take = (end, shown) => { out += shown(src.slice(i, end)); i = end; };
  while (i < src.length) {
    const raw = src[i] === 'r' || src[i] === 'b' || src[i] === 'c' ? rawString(src, i) : null;
    const char = src[i] === "'" ? charEnd(src, i) : null;
    if (src.startsWith('//', i)) { const e = src.indexOf('\n', i); take(e === -1 ? src.length : e, spaces); }
    else if (src.startsWith('/*', i)) take(commentEnd(src, i), spaces);
    else if (raw) { out += spaces(src.slice(i, raw.quote)); i = raw.quote; take(raw.end, quoted); }
    else if (src[i] === '"') take(stringEnd(src, i), quoted);
    else if (char) take(char, quoted);
    else { out += src[i]; i += 1; }
  }
  return out;
}

const TEST_MARK = /#\[\s*(?:cfg\s*\(\s*(?:all\s*\(\s*)?test\b[^\]]*\)|(?:\w+::)*test\b[^\]]*)\s*\]/g;

// The end of the item an attribute marks: its closing brace, or the `;` of an item with no body.
function itemEnd(code, start) {
  let round = 0;
  for (let i = start; i < code.length; i += 1) {
    const c = code[i];
    if (c === '(' || c === '[') round += 1;
    else if (c === ')' || c === ']') round -= 1;
    else if (c === ';' && round === 0) return i + 1;
    else if (c === '{' && round === 0) {
      let depth = 0;
      for (let j = i; j < code.length; j += 1) {
        if (code[j] === '{') depth += 1;
        else if (code[j] === '}' && --depth === 0) return j + 1;
      }
      return code.length;
    }
  }
  return code.length;
}

export function withoutTests(code) {
  let out = '';
  let at = 0;
  for (const m of code.matchAll(TEST_MARK)) {
    if (m.index < at) continue;
    const end = itemEnd(code, m.index + m[0].length);
    out += code.slice(at, m.index) + spaces(code.slice(m.index, end));
    at = end;
  }
  return out + code.slice(at);
}
