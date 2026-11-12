// last-prompt: the user's own words that started the current turn, read from the session's transcript once per transcript and offset
// (KWB-201). no-find and suite-once each asked on every Pre Bash call, and each read, decoded and parsed megabytes: in an unattended run the
// turn is the whole run and the prompt sits far back (140 ms and 180 MB of a worker's RSS on a 25 MB transcript). The first call reads the file
// from its end in 1 MB pieces until it meets a prompt; the answer is kept by path with the size and mtime it was read at and the offset after the
// last whole line, and a later call reads only what was appended since. A file that shrank or changed at its size is read again.
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { promptOfLine } from './prompt-of.mts';

const CHUNK = 1 << 20;
const KEPT = 8;   // transcripts remembered: a session has one, agents a few

interface Known { size: number; mtimeMs: number; scanned: number; prompt: string }
const known = new Map<string, Known>();
let total = 0;

/** Bytes read from transcripts by this process so far (a counter for tests: a second call must read none). */
export const bytesRead = (): number => total;

function read(fd: number, from: number, to: number): Buffer {
  const buf = Buffer.allocUnsafe(to - from);
  const n = readSync(fd, buf, 0, buf.length, from);
  total += n;
  return n === buf.length ? buf : buf.subarray(0, n);
}

/** The whole file, last piece first: the prompt of the last line that holds one, and the offset after the last newline. */
function scanBack(fd: number, size: number): { prompt: string; scanned: number } {
  let carry: Buffer = Buffer.alloc(0);   // the start of a line cut by the piece's start, joined to the piece before it
  let prompt: string | null = null;
  let scanned = -1;
  for (let end = size; end > 0 && (prompt === null || scanned < 0); end -= CHUNK) {
    const from = Math.max(0, end - CHUNK);
    const joined = carry.length ? Buffer.concat([read(fd, from, end), carry]) : read(fd, from, end);
    if (scanned < 0 && joined.includes(10)) scanned = from + joined.lastIndexOf(10) + 1;
    const cut = from > 0 ? joined.indexOf(10) : -1;
    carry = from > 0 ? joined.subarray(0, cut < 0 ? joined.length : cut) : Buffer.alloc(0);
    if (prompt !== null || (from > 0 && cut < 0)) continue;
    const lines = joined.subarray(cut + 1).toString('utf8').split('\n');
    for (let i = lines.length - 1; i >= 0 && prompt === null; i -= 1) prompt = promptOfLine(lines[i] ?? '');
  }
  return { prompt: prompt ?? '', scanned: Math.max(0, scanned) };
}

/** What was appended after `from`: the newest prompt in its whole lines (the old one when none), and the offset after the last whole line. */
function scanForward(fd: number, from: number, size: number, prompt: string): { prompt: string; scanned: number } {
  let at = from;
  let found = prompt;
  let rest: Buffer = Buffer.alloc(0);
  while (at < size) {
    const end = Math.min(size, at + 4 * CHUNK);
    const joined = rest.length ? Buffer.concat([rest, read(fd, at, end)]) : read(fd, at, end);
    const nl = joined.lastIndexOf(10);
    rest = nl < 0 ? joined : joined.subarray(nl + 1);
    if (nl >= 0) for (const line of joined.subarray(0, nl).toString('utf8').split('\n')) found = promptOfLine(line) ?? found;
    at = end;
  }
  return { prompt: found, scanned: size - rest.length };
}

/** The user's own words that started the current turn, or '' (no transcript, or no prompt in it). */
export function lastPrompt(path: string): string {
  let fd: number;
  try { fd = openSync(path, 'r'); } catch { return ''; }
  try {
    const { size, mtimeMs } = fstatSync(fd);
    const was = known.get(path);
    if (was && was.size === size && was.mtimeMs === mtimeMs) return was.prompt;
    const grew = was !== undefined && size > was.size && was.scanned <= size;
    const { prompt, scanned } = grew ? scanForward(fd, was.scanned, size, was.prompt) : scanBack(fd, size);
    known.delete(path);
    known.set(path, { size, mtimeMs, scanned, prompt });
    for (const old of [...known.keys()].slice(0, Math.max(0, known.size - KEPT))) known.delete(old);
    return prompt;
  } finally {
    closeSync(fd);
  }
}
