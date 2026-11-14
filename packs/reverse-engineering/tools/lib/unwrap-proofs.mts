// What proves an unwrapping, beside the names it reads (unwrap.mts tries the wrappings; these say whether one is right). A packing is proved by the
// address stride and the checksum before anything is concluded from the parse.
//   unpackedLength(packed) -> bytes 7-in-8 packing gives back       strideProves(packed, step) -> does the address step equal that length
//   rolandChecksumOk(body) -> address, data and checksum sum to 0 mod 128
//   payloadStarts(buffer, stored, modulus) -> offsets where the bytes from there to the end sum to `stored`: a header sum pins where the payload starts
//   checksumSpans(words, stored) -> word counts whose 16-bit sum is `stored` (a record's sum may run one word past its stated length)
//   xorKeyFromErased(buffer, period) -> the commonest repeating key read from runs of erased bytes, how many runs hold it, and whether every run does; null unless two runs agree
//   xorWithKey(buffer, key) -> the buffer with the key removed
//   oneBlockPerFile(file, size) -> exactly `size` bytes: a vendor's file over-runs its block with padding, and taking it all drifts the offset

const SEVEN = 7;
const GROUP = 8;
const BYTE = 0xff;
const WORD = 0xffff;
const MIN_ERASED_RUN = 2;

export function unpackedLength(packed: number): number {
  const rest = packed % GROUP;
  return Math.floor(packed / GROUP) * SEVEN + (rest > 0 ? rest - 1 : 0);
}

export const strideProves = (packed: number, addressStep: number): boolean => unpackedLength(packed) === addressStep;

export function rolandChecksumOk(body: readonly number[]): boolean {
  return body.reduce((sum, x) => sum + x, 0) % 128 === 0;
}

export function payloadStarts(buffer: Buffer, stored: number, modulus = WORD + 1, search = 64): number[] {
  const starts: number[] = [];
  let sum = buffer.reduce((s, x) => s + x, 0);
  for (let at = 0; at <= Math.min(search, buffer.length); at += 1) {
    if (sum % modulus === stored) starts.push(at);
    sum -= buffer[at] ?? 0;
  }
  return starts;
}

export function checksumSpans(words: readonly number[], stored: number): number[] {
  const spans: number[] = [];
  let sum = 0;
  words.forEach((w, i) => {
    sum = (sum + w) & WORD;
    if (sum === stored) spans.push(i + 1);
  });
  return spans;
}

/** The key, how many erased runs showed it, and whether every run agreed. */
export interface KeyFound { key: Buffer; runs: number; global: boolean }

// An erased region is a run of one byte (0xff); under a repeating XOR key it reads as the key itself, so the key is the run's bytes at their phase.
export function xorKeyFromErased(buffer: Buffer, period: number, erased = BYTE): KeyFound | null {
  const keys: Buffer[] = [];
  for (let i = 0; i + period <= buffer.length; i += 1) {
    const x = buffer[i] ?? 0;
    if (i % period !== 0) continue;
    const window = buffer.subarray(i, i + period * MIN_ERASED_RUN);
    if (window.length < period * MIN_ERASED_RUN) break;
    const repeats = window.subarray(0, period).equals(window.subarray(period));
    const varied = window.subarray(0, period).some((b) => b !== x);
    if (repeats && varied) keys.push(Buffer.from(window.subarray(0, period).map((b) => b ^ erased)));
  }
  // The key is the commonest one: a header's padding or a repeated table makes a pair of equal blocks of its own, and it comes first.
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k.toString('hex'), (counts.get(k.toString('hex')) ?? 0) + 1);
  const [best] = [...counts].sort((a, b) => b[1] - a[1]);
  if (!best || best[1] < MIN_ERASED_RUN) return null;
  return { key: Buffer.from(best[0], 'hex'), runs: best[1], global: counts.size === 1 };
}

export function xorWithKey(buffer: Buffer, key: Buffer): Buffer {
  return Buffer.from(buffer.map((x, i) => x ^ (key[i % key.length] ?? 0)));
}

export const oneBlockPerFile = (file: Buffer, size: number): Buffer => file.subarray(0, size);
