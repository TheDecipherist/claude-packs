// Every way a firmware image or a dump has been seen to wrap its text. Text is rarely encrypted, but it is often wrapped, and a name a manual prints is
// the test of an unwrapping: if the name reads, the unwrapping is right. A new wrapping is one row.
//   wrappings() -> [{ name, open(buffer) -> buffer }]     interleave(a, b) -> one image from an even and an odd EPROM
//   entropyOf(buffer) -> bits per byte
//   shiftedHits(buffer, text) -> [{ at, shift }]           a custom character set: the letters keep their distances, whatever the code of 'A'
//   shiftedHitsMany(buffer, texts) -> one such list per text, in one pass over the buffer
import { findAll } from './multi-find.mts';

/** One way of wrapping: its name, and what opens a buffer wrapped so. */
export interface Wrapping { name: string; open: (buffer: Buffer) => Buffer }
/** A hit of a text under a custom character set: where it sits, and the shift of its first letter. */
export interface ShiftedHit { at: number; shift: number }

const at8 = (b: Uint8Array, i: number): number => b[i] ?? 0;
const eachByte = (b: Buffer, fn: (x: number) => number): Buffer => Buffer.from(b.map(fn));

function everyOther(b: Buffer, from: number): Buffer {
  const out = Buffer.alloc(Math.ceil((b.length - from) / 2));
  for (let i = from, o = 0; i < b.length; i += 2, o += 1) out[o] = at8(b, i);
  return out;
}

// Each word of `width` bytes reversed, the first whole word starting at `phase`.
function reversedWords(b: Buffer, width: number, phase: number): Buffer {
  const out = Buffer.from(b);
  for (let i = phase; i + width <= b.length; i += width) for (let k = 0; k < width; k += 1) out[i + k] = at8(b, i + width - 1 - k);
  return out;
}

// MIDI's 8-to-7 packing: seven data bytes and one byte of their high bits, that byte first or last, and its bit k for data byte k or for data byte 6-k.
// Roland's updates are high bits first with bit k for byte k; the wrong order reads as noise, so both are tried.
function unpacked7(b: Buffer, phase: number, highFirst: boolean, bitK: boolean): Buffer {
  const out: number[] = [];
  const take = (high: number, from: number, count: number): void => { for (let k = 0; k < count; k += 1) out.push((at8(b, from + k) & 0x7f) | (((high >> (bitK ? k : 6 - k)) & 1) << 7)); };
  let i = phase;
  for (; i + 8 <= b.length; i += 8) take(at8(b, highFirst ? i : i + 7), highFirst ? i + 1 : i, 7);
  if (highFirst && b.length - i >= 2) take(at8(b, i), i + 1, b.length - i - 1); // a message's last group is short, and dropping it shifts everything after
  return Buffer.from(out);
}

// One byte sent as two: the nibble in the low four bits of each.
function joinedNibbles(b: Buffer, phase: number, highFirst: boolean): Buffer {
  const out = Buffer.alloc(Math.floor((b.length - phase) / 2));
  for (let i = phase, o = 0; i + 1 < b.length; i += 2, o += 1) {
    const [first, second] = [at8(b, i) & 15, at8(b, i + 1) & 15] as const;
    out[o] = highFirst ? (first << 4) | second : (second << 4) | first;
  }
  return out;
}

// A 16-bit word as three bytes, marker first: 0x40 | top four bits, then two groups of six. Not 7-in-8, and a CPU guess fails until it is undone.
function threeByteWords(b: Buffer, bigEndian: boolean): Buffer {
  const out: number[] = [];
  for (let i = 0; i + 3 <= b.length; i += 3) {
    const word = ((at8(b, i) & 0x0f) << 12) | ((at8(b, i + 1) & 0x3f) << 6) | (at8(b, i + 2) & 0x3f);
    out.push(...(bigEndian ? [word >> 8, word & 255] : [word & 255, word >> 8]));
  }
  return Buffer.from(out);
}

// An OS update is many sysex messages, in a MIDI file or not, each with its own header, so packed groups restart at every message. Data bytes are below 0x80, so F0 and F7 end them.
function sysexMessages(b: Buffer): Buffer[] {
  const out: Buffer[] = [];
  for (let start = b.indexOf(0xf0); start !== -1; start = b.indexOf(0xf0, start + 1)) {
    const end = b.indexOf(0xf7, start);
    if (end === -1) break;
    out.push(b.subarray(start + 1, end));
    start = end;
  }
  return out;
}

type Opener = (buffer: Buffer) => Buffer;
const perMessage = (b: Buffer, header: number, open: Opener): Buffer => Buffer.concat(sysexMessages(b).map((m) => open(m.subarray(header))));
const LONGEST_HEADER = 20;
const SEVEN_BIT = [true, false].flatMap((first) => [true, false].map((bitK) => ({ first, bitK, name: `7-bit packed, high bits ${first ? 'first' : 'last'}, bit ${bitK ? 'k' : '6-k'}` })));
const PACKINGS: readonly Wrapping[] = [
  ...SEVEN_BIT.map((p) => ({ name: p.name, open: (m: Buffer) => unpacked7(m, 0, p.first, p.bitK) })),
  ...SEVEN_BIT.filter((p) => p.first).map((p) => ({ name: `${p.name}, checksum last`, open: (m: Buffer) => unpacked7(m.subarray(0, -1), 0, p.first, p.bitK) })),
  { name: 'nibbles, high first', open: (m) => joinedNibbles(m, 0, true) },
  { name: 'nibbles, low first', open: (m) => joinedNibbles(m, 0, false) },
  { name: 'three bytes per word, high byte first', open: (m) => threeByteWords(m, true) },
  { name: 'three bytes per word, low byte first', open: (m) => threeByteWords(m, false) },
];

const phases = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

export function wrappings(): Wrapping[] {
  return [
    { name: 'as stored', open: (b) => b },
    { name: 'high bit set', open: (b) => eachByte(b, (x) => x & 0x7f) },
    { name: 'even bytes only', open: (b) => everyOther(b, 0) },
    { name: 'odd bytes only', open: (b) => everyOther(b, 1) },
    ...phases(2).map((p) => ({ name: `16-bit words swapped, from ${p}`, open: (b: Buffer) => reversedWords(b, 2, p) })),
    ...phases(3).map((p) => ({ name: `24-bit words reversed, from ${p}`, open: (b: Buffer) => reversedWords(b, 3, p) })),
    ...phases(4).map((p) => ({ name: `32-bit words reversed, from ${p}`, open: (b: Buffer) => reversedWords(b, 4, p) })),
    ...phases(8).flatMap((p) => SEVEN_BIT.map((s) => ({ name: `${s.name}, from ${p}`, open: (b: Buffer) => unpacked7(b, p, s.first, s.bitK) }))),
    ...phases(2).flatMap((p) => [true, false].map((first) => ({ name: `nibbles, ${first ? 'high' : 'low'} first, from ${p}`, open: (b: Buffer) => joinedNibbles(b, p, first) }))),
    ...phases(LONGEST_HEADER + 1).flatMap((h) => PACKINGS.map((p) => ({ name: `sysex messages, ${h}-byte header, ${p.name}`, open: (b: Buffer) => perMessage(b, h, p.open) }))),
  ];
}

export function interleave(even: Buffer, odd: Buffer): Buffer {
  const out = Buffer.alloc(even.length + odd.length);
  for (let i = 0; i < even.length; i += 1) out[i * 2] = at8(even, i);
  for (let i = 0; i < odd.length; i += 1) out[i * 2 + 1] = at8(odd, i);
  return out;
}

const distances = (b: Buffer): Buffer => {
  const out = Buffer.alloc(Math.max(0, b.length - 1));
  for (let i = 1; i < b.length; i += 1) out[i - 1] = (at8(b, i) - at8(b, i - 1)) & 255;
  return out;
};
const SHIFTED_CAP = 64;

// Every text's hits in one pass over the buffer's distances, made once (KWB-120: they were made again for every name).
export function shiftedHitsMany(buffer: Buffer, texts: readonly string[]): ShiftedHit[][] {
  const hay = distances(buffer);
  const found = findAll(hay, texts.map((t) => distances(Buffer.from(t, 'latin1'))), SHIFTED_CAP);
  return found.map((offsets, i) => offsets.map((at) => ({ at, shift: (at8(buffer, at) - (texts[i] ?? '').charCodeAt(0)) & 255 })));
}

export const shiftedHits = (buffer: Buffer, text: string): ShiftedHit[] => shiftedHitsMany(buffer, [text])[0] ?? [];

export function entropyOf(b: Buffer): number {
  const counts: number[] = new Array<number>(256).fill(0);
  for (const x of b) counts[x] = (counts[x] ?? 0) + 1;
  return counts.filter(Boolean).reduce((bits, n) => bits - (n / b.length) * Math.log2(n / b.length), 0);
}
