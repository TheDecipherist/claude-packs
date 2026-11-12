// last-prompt: the user's own words that started the current turn, read from the session's transcript once per transcript and offset
// (KWB-201). no-find and suite-once each asked on every Pre Bash call, and each read, decoded and parsed megabytes: in an unattended run the
// turn is the whole run and the prompt sits far back (140 ms and 180 MB of a worker's RSS on a 25 MB transcript). The first call reads the file
// from its end in 1 MB pieces into one buffer until it meets a prompt, looking at each line's bytes and decoding only a line that can be a
// prompt (a tool result, nearly every line, is never made a string); the answer is kept by path with the size and mtime it was read at and the
// offset after the last whole line, and a later call reads only what was appended since. A file that shrank or changed at its size is read again.
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { promptOfLine } from './prompt-of.mts';

const CHUNK = 1 << 20;
const KEPT = 8;   // transcripts remembered: a session has one, agents a few
const NEWLINE = 10;

interface Known { size: number; mtimeMs: number; scanned: number; prompt: string }
interface Look { prompt: string; scanned: number }
const known = new Map<string, Known>();
let total = 0;

/** Bytes read from transcripts by this process so far (a counter for tests: a second call must read none). */
export const bytesRead = (): number => total;

/** The prompt a line's bytes hold, or null: a line that is no user entry, or holds a tool result, is passed over undecoded. */
function promptOfBytes(line: Buffer): string | null {
  if (line.length === 0 || !line.includes('"user"') || line.includes('"type":"tool_result"')) return null;
  return promptOfLine(line.toString('utf8'));
}

/** The whole file, last piece first: the prompt of the last line that holds one, and the offset after the last newline. */
function scanBack(fd: number, size: number): Look {
  let scratch: Buffer = Buffer.allocUnsafe(2 * CHUNK);   // the piece, then the start of the line it cut (the end of the piece after it)
  let carry: Buffer = Buffer.alloc(0);
  let prompt: string | null = null;
  let scanned = -1;
  for (let end = size; end > 0 && (prompt === null || scanned < 0); end -= CHUNK) {
    const from = Math.max(0, end - CHUNK);
    const n = readSync(fd, scratch, 0, end - from, from);
    total += n;
    if (n + carry.length > scratch.length) scratch = Buffer.concat([scratch.subarray(0, n), carry], 2 * (n + carry.length));
    else carry.copy(scratch, n);
    const buf = scratch.subarray(0, n + carry.length);
    if (scanned < 0 && buf.includes(NEWLINE)) scanned = from + buf.lastIndexOf(NEWLINE) + 1;
    carry = Buffer.alloc(0);
    for (let pos = buf.length; pos > 0 && prompt === null;) {
      const nl = buf.lastIndexOf(NEWLINE, pos - 1);
      if (nl < 0 && from > 0) { carry = Buffer.from(buf.subarray(0, pos)); break; }   // a line cut by the piece's start
      prompt = promptOfBytes(buf.subarray(nl + 1, pos));
      pos = nl;
    }
  }
  return { prompt: prompt ?? '', scanned: Math.max(0, scanned) };
}

/** What was appended after `from`: the newest prompt in its whole lines (the old one when none), and the offset after the last whole line. */
function scanForward(fd: number, from: number, size: number, prompt: string): Look {
  let found = prompt;
  let rest: Buffer = Buffer.alloc(0);
  for (let at = from; at < size; at += 4 * CHUNK) {
    const piece = Buffer.allocUnsafe(Math.min(size, at + 4 * CHUNK) - at);
    total += readSync(fd, piece, 0, piece.length, at);
    const buf = rest.length ? Buffer.concat([rest, piece]) : piece;
    let p = 0;
    for (let nl = buf.indexOf(NEWLINE, p); nl >= 0; nl = buf.indexOf(NEWLINE, p)) { found = promptOfBytes(buf.subarray(p, nl)) ?? found; p = nl + 1; }
    rest = Buffer.from(buf.subarray(p));
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
