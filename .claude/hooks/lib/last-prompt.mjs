// last-prompt: the user's own words that started the current turn, read from the session's transcript once per transcript and offset
// (KWB-201). no-find and suite-once each asked on every Pre Bash call, and each read, decoded and parsed megabytes: in an unattended run the
// turn is the whole run and the prompt sits far back (140 ms and 180 MB of a worker's RSS on a 25 MB transcript). The first call reads the file
// from its end in 1 MB pieces into one buffer until it meets a prompt, looking at each line's bytes and decoding only a line that can be a
// prompt (a tool result, nearly every line, is never made a string); the answer is kept by path with the size and mtime it was read at and the
// offset after the last whole line, and a later call reads only what was appended since. A file that shrank or changed at its size is read again.
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { eachLineBack } from './lines-back.mjs';
import { promptOfBytes } from './prompt-of.mjs';
const CHUNK = 1 << 20;
const KEPT = 8; // transcripts remembered: a session has one, agents a few
const NEWLINE = 10;
const known = new Map();
let total = 0;
/** Bytes read from transcripts by this process so far (a counter for tests: a second call must read none). */
export const bytesRead = () => total;
/** The whole file, last line first: the prompt of the last line that holds one, and the offset after the last newline. */
function scanBack(fd, size) {
    const found = { prompt: null };
    const walked = eachLineBack(fd, size, (line) => (found.prompt = promptOfBytes(line)) !== null);
    total += walked.read;
    return { prompt: found.prompt ?? '', scanned: walked.lastNewline };
}
/** What was appended after `from`: the newest prompt in its whole lines (the old one when none), and the offset after the last whole line. */
function scanForward(fd, from, size, prompt) {
    let found = prompt;
    let rest = Buffer.alloc(0);
    for (let at = from; at < size; at += 4 * CHUNK) {
        const piece = Buffer.allocUnsafe(Math.min(size, at + 4 * CHUNK) - at);
        total += readSync(fd, piece, 0, piece.length, at);
        const buf = rest.length ? Buffer.concat([rest, piece]) : piece;
        let p = 0;
        for (let nl = buf.indexOf(NEWLINE, p); nl >= 0; nl = buf.indexOf(NEWLINE, p)) {
            found = promptOfBytes(buf.subarray(p, nl)) ?? found;
            p = nl + 1;
        }
        rest = Buffer.from(buf.subarray(p));
    }
    return { prompt: found, scanned: size - rest.length };
}
/** The user's own words that started the current turn, or '' (no transcript, or no prompt in it). */
export function lastPrompt(path) {
    let fd;
    try {
        fd = openSync(path, 'r');
    }
    catch {
        return '';
    }
    try {
        const { size, mtimeMs } = fstatSync(fd);
        const was = known.get(path);
        if (was && was.size === size && was.mtimeMs === mtimeMs)
            return was.prompt;
        const grew = was !== undefined && size > was.size && was.scanned <= size;
        const { prompt, scanned } = grew ? scanForward(fd, was.scanned, size, was.prompt) : scanBack(fd, size);
        known.delete(path);
        known.set(path, { size, mtimeMs, scanned, prompt });
        for (const old of [...known.keys()].slice(0, Math.max(0, known.size - KEPT)))
            known.delete(old);
        return prompt;
    }
    finally {
        closeSync(fd);
    }
}
