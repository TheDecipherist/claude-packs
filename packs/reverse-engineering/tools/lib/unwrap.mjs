// Every way a firmware image or a dump has been seen to wrap its text. Text is rarely encrypted, but it is often wrapped, and a name a manual prints is
// the test of an unwrapping: if the name reads, the unwrapping is right. A new wrapping is one row.
//   wrappings() -> [{ name, open(buffer) -> buffer }]     interleave(a, b) -> one image from an even and an odd EPROM
//   shiftedHits(buffer, text) -> [{ at, shift }]           a custom character set: the letters keep their distances, whatever the code of 'A'

const eachByte = (b, fn) => Buffer.from(b.map(fn));

function everyOther(b, from) {
  const out = Buffer.alloc(Math.ceil((b.length - from) / 2));
  for (let i = from, o = 0; i < b.length; i += 2, o += 1) out[o] = b[i];
  return out;
}

// Each word of `width` bytes reversed, the first whole word starting at `phase`.
function reversedWords(b, width, phase) {
  const out = Buffer.from(b);
  for (let i = phase; i + width <= b.length; i += width) for (let k = 0; k < width; k += 1) out[i + k] = b[i + width - 1 - k];
  return out;
}

// MIDI's 8-to-7 packing: seven data bytes and one byte of their high bits, that byte first or last.
function unpacked7(b, phase, highFirst) {
  const out = [];
  for (let i = phase; i + 8 <= b.length; i += 8) {
    const high = b[highFirst ? i : i + 7];
    for (let k = 0; k < 7; k += 1) out.push((b[i + k + (highFirst ? 1 : 0)] & 0x7f) | (((high >> (highFirst ? 6 - k : k)) & 1) << 7));
  }
  return Buffer.from(out);
}

// One byte sent as two: the nibble in the low four bits of each.
function joinedNibbles(b, phase, highFirst) {
  const out = Buffer.alloc(Math.floor((b.length - phase) / 2));
  for (let i = phase, o = 0; i + 1 < b.length; i += 2, o += 1) {
    const [first, second] = [b[i] & 15, b[i + 1] & 15];
    out[o] = highFirst ? (first << 4) | second : (second << 4) | first;
  }
  return out;
}

// An OS update is many sysex messages, in a MIDI file or not, each with its own header, so packed groups restart at every message. Data bytes are below 0x80, so F0 and F7 end them.
function sysexMessages(b) {
  const out = [];
  for (let start = b.indexOf(0xf0); start !== -1; start = b.indexOf(0xf0, start + 1)) {
    const end = b.indexOf(0xf7, start);
    if (end === -1) break;
    out.push(b.subarray(start + 1, end));
    start = end;
  }
  return out;
}

const perMessage = (b, header, open) => Buffer.concat(sysexMessages(b).map((m) => open(m.subarray(header))));
const LONGEST_HEADER = 20;
const PACKINGS = [
  { name: '7-bit packed, high bits first', open: (m) => unpacked7(m, 0, true) },
  { name: '7-bit packed, high bits last', open: (m) => unpacked7(m, 0, false) },
  { name: 'nibbles, high first', open: (m) => joinedNibbles(m, 0, true) },
  { name: 'nibbles, low first', open: (m) => joinedNibbles(m, 0, false) },
];

const phases = (n) => Array.from({ length: n }, (_, i) => i);

export function wrappings() {
  return [
    { name: 'as stored', open: (b) => b },
    { name: 'high bit set', open: (b) => eachByte(b, (x) => x & 0x7f) },
    { name: 'even bytes only', open: (b) => everyOther(b, 0) },
    { name: 'odd bytes only', open: (b) => everyOther(b, 1) },
    ...phases(2).map((p) => ({ name: `16-bit words swapped, from ${p}`, open: (b) => reversedWords(b, 2, p) })),
    ...phases(3).map((p) => ({ name: `24-bit words reversed, from ${p}`, open: (b) => reversedWords(b, 3, p) })),
    ...phases(4).map((p) => ({ name: `32-bit words reversed, from ${p}`, open: (b) => reversedWords(b, 4, p) })),
    ...phases(8).flatMap((p) => [true, false].map((first) => ({ name: `7-bit packed, high bits ${first ? 'first' : 'last'}, from ${p}`, open: (b) => unpacked7(b, p, first) }))),
    ...phases(2).flatMap((p) => [true, false].map((first) => ({ name: `nibbles, ${first ? 'high' : 'low'} first, from ${p}`, open: (b) => joinedNibbles(b, p, first) }))),
    ...phases(LONGEST_HEADER + 1).flatMap((h) => PACKINGS.map((p) => ({ name: `sysex messages, ${h}-byte header, ${p.name}`, open: (b) => perMessage(b, h, p.open) }))),
  ];
}

export function interleave(even, odd) {
  const out = Buffer.alloc(even.length + odd.length);
  for (let i = 0; i < even.length; i += 1) out[i * 2] = even[i];
  for (let i = 0; i < odd.length; i += 1) out[i * 2 + 1] = odd[i];
  return out;
}

const distances = (b) => { const out = Buffer.alloc(Math.max(0, b.length - 1)); for (let i = 1; i < b.length; i += 1) out[i - 1] = (b[i] - b[i - 1]) & 255; return out; };

export function shiftedHits(buffer, text) {
  const hay = distances(buffer);
  const needle = distances(Buffer.from(text, 'latin1'));
  const hits = [];
  for (let at = hay.indexOf(needle); at !== -1 && hits.length < 64; at = hay.indexOf(needle, at + 1)) hits.push({ at, shift: (buffer[at] - text.charCodeAt(0)) & 255 });
  return hits;
}
