// Say what an image is and whether it is whole, before any name search or decode: entropy per window, the minimum period
// of each half (an over-read dump), stuck address lines, a blank half, windows with no 0x00 byte, and a census of the
// whole image (erased, flat random, text, other) that sums to 100 %.
//   node .claude/tools/dump-triage.mjs <image> [--window <bytes>]
// Exit 0: no finding. Exit 1: findings, listed (the census is printed either way). Exit 2: the command was used wrongly.
import { readFileSync } from 'node:fs';
import { isMain } from '../hooks/lib/hook-log.mts';

const WINDOW = 4096;
/** A line whose pairs agree this often is stuck: random data agrees 0.4 % of the time, code and tables 40-50 %. */
const STUCK = 0.9;
/** Compression and container magics: counted against the number of hits random bytes would give. */
const MAGICS: readonly { name: string; bytes: readonly number[] }[] = [
  { name: 'gzip', bytes: [0x1f, 0x8b, 0x08] }, { name: 'zip', bytes: [0x50, 0x4b, 0x03, 0x04] },
  { name: 'bzip2', bytes: [0x42, 0x5a, 0x68] }, { name: '7z', bytes: [0x37, 0x7a, 0xbc, 0xaf] },
  { name: 'xz', bytes: [0xfd, 0x37, 0x7a, 0x58, 0x5a] }, { name: 'lz4', bytes: [0x04, 0x22, 0x4d, 0x18] },
  { name: 'MIDI file', bytes: [0x4d, 0x54, 0x68, 0x64] },
];

/** Shannon entropy in bits per byte. */
export function entropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const counts = new Array<number>(256).fill(0);
  for (const b of bytes) counts[b] = (counts[b] ?? 0) + 1;
  let h = 0;
  for (const c of counts) if (c > 0) h -= (c / bytes.length) * Math.log2(c / bytes.length);
  return h;
}

/** The smallest p up to half the length with bytes[i] == bytes[i+p] all along, or 0 when the data does not repeat. Prefix function: n - fail[n-1], in O(n). */
export function minPeriod(bytes: Uint8Array): number {
  const n = bytes.length;
  if (n < 2) return 0;
  const fail = new Int32Array(n);
  for (let i = 1, k = 0; i < n; i++) {
    while (k > 0 && bytes[i] !== bytes[k]) k = fail[k - 1] ?? 0;
    if (bytes[i] === bytes[k]) k++;
    fail[i] = k;
  }
  const p = n - (fail[n - 1] ?? 0);
  return p <= n / 2 ? p : 0;
}

/** Per address line k (a power-of-two image): how often b[i] == b[i ^ (1 << k)] over the pairs of the line. */
export function lineAgreement(bytes: Uint8Array): number[] {
  const lines = Math.log2(bytes.length);
  if (!Number.isInteger(lines)) return [];
  return Array.from({ length: lines }, (_, k) => {
    let same = 0;
    for (let i = 0; i < bytes.length; i++) if (!(i & (1 << k)) && bytes[i] === bytes[i | (1 << k)]) same++;
    return same / (bytes.length / 2);
  });
}

/** Lines that agree past STUCK. A blank or constant image makes every line agree, so that is not a stuck line. */
export const stuckLines = (bytes: Uint8Array): { line: number; agreement: number }[] => {
  const agreement = lineAgreement(bytes);
  if (agreement.every((a) => a >= STUCK)) return [];
  return agreement.flatMap((a, line) => (a >= STUCK ? [{ line, agreement: a }] : []));
};

export type Kind = 'erased' | 'flat random' | 'text' | 'other';
const printable = (b: number): boolean => (b >= 0x20 && b < 0x7f) || b === 0x0a || b === 0x0d || b === 0x09;

/** What one window is, by the rule applied first to last. */
export function kindOf(window: Uint8Array): Kind {
  const fill = (v: number): number => window.filter((b) => b === v).length / window.length;
  if (fill(0xff) >= 0.9 || fill(0x00) >= 0.9) return 'erased';
  if (entropy(window) >= 7.9) return 'flat random';
  if (window.filter(printable).length / window.length >= 0.7) return 'text';
  return 'other';
}

/** Every window of the image in one kind, as a share of the image: the shares sum to 1. */
export function census(bytes: Uint8Array, size = WINDOW): Record<Kind, number> {
  const share: Record<Kind, number> = { erased: 0, 'flat random': 0, text: 0, other: 0 };
  for (let at = 0; at < bytes.length; at += size) {
    const window = bytes.subarray(at, at + size);
    share[kindOf(window)] += window.length / bytes.length;
  }
  return share;
}

const hits = (bytes: Uint8Array, magic: readonly number[]): number => {
  let n = 0;
  for (let i = 0; i + magic.length <= bytes.length; i++) if (magic.every((m, j) => bytes[i + j] === m)) n++;
  return n;
};

/** The findings (what is wrong or to be known) and the report lines (what was measured). */
export function triage(bytes: Uint8Array, size = WINDOW): { findings: string[]; report: string[] } {
  const findings: string[] = [];
  const report: string[] = [`size: ${bytes.length} bytes, entropy ${entropy(bytes).toFixed(3)} bits per byte`];
  const windows = Array.from({ length: Math.ceil(bytes.length / size) }, (_, w) => bytes.subarray(w * size, (w + 1) * size));
  const flat = windows.filter((w) => kindOf(w) === 'flat random').length;
  if (flat > 0) findings.push(`${flat} of ${windows.length} windows at 7.9 or more bits per byte: encrypted or compressed (flat 8.000 is encrypted), not code`);
  for (const m of MAGICS) {
    const found = hits(bytes, m.bytes);
    const expected = bytes.length / 256 ** m.bytes.length;
    if (found > 0) report.push(`magic ${m.name}: ${found} found, ${expected.toFixed(2)} expected from random bytes`);
  }
  const half = bytes.length >> 1;
  [bytes.subarray(0, half), bytes.subarray(half)].forEach((part, n) => {
    const name = n === 0 ? 'lower half' : 'upper half';
    const period = minPeriod(part);
    if (period > 0) findings.push(`${name} repeats every ${period} bytes: an over-read dump is evidence only for ${period} bytes, fit nothing past it`);
    if (part.length > 0 && (part.every((b) => b === 0xff) || part.every((b) => b === 0x00))) findings.push(`${name} is blank: a wrong part size, or dumped twice`);
  });
  for (const s of stuckLines(bytes)) findings.push(`stuck address line A${s.line} (mask 0x${(1 << s.line).toString(16)}): b[i] == b[i^mask] for ${(s.agreement * 100).toFixed(1)} % of pairs`);
  const noZero = windows.filter((w) => w.length === size && !w.includes(0) && kindOf(w) !== 'text').length;
  if (noZero > 0) findings.push(`${noZero} windows of ${size} bytes hold no 0x00 byte: not plain 8-bit code`);
  const share = census(bytes, size);
  report.push(`census: ${(Object.keys(share) as Kind[]).map((k) => `${k} ${(share[k] * 100).toFixed(1)} %`).join(', ')}`);
  return { findings, report };
}

function main(args: readonly string[]): number {
  const [image, flag, value] = args;
  if (image === undefined || (flag !== undefined && (flag !== '--window' || !(Number.isInteger(Number(value)) && Number(value) >= 1)))) {
    console.error('usage: node .claude/tools/dump-triage.mjs <image> [--window <bytes>]');
    return 2;
  }
  const { findings, report } = triage(readFileSync(image), flag === undefined ? WINDOW : Number(value));
  console.log([...report, findings.length === 0 ? 'dump triage: no finding' : `dump triage: ${findings.length} finding(s)`, ...findings.map((f) => `  ${f}`)].join('\n'));
  return findings.length === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
