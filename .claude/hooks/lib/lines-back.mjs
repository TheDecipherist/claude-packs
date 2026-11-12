// lines-back: a file's lines read from its end in 1 MB pieces, as bytes, never the whole file in memory and never decoded here (rss). The
// transcript readers use it: last-prompt.mts for the turn's prompt, turn.mts for the turn itself. A transcript is tens of MB of tool results
// whose lines a reader passes over by their bytes; only the lines it keeps become strings.
import { readSync } from 'node:fs';
const CHUNK = 1 << 20;
const NEWLINE = 10;
/** Calls `visit` with each line before `size` (without its newline), the last line first, until it returns true. The line is a view of a
 *  buffer the next piece reuses: decode or copy it there and then. The last line, after the last newline, is visited too (a torn line, or
 *  an empty one). After a stop the walk reads on only until it has seen a newline, so `lastNewline` is known. */
export function eachLineBack(fd, size, visit) {
    let scratch = Buffer.allocUnsafe(2 * CHUNK); // the piece, then the start of the line it cut (the end of the piece after it)
    let carry = Buffer.alloc(0);
    let read = 0;
    let last = -1;
    let stopped = false;
    for (let end = size; end > 0 && (!stopped || last < 0); end -= CHUNK) {
        const from = Math.max(0, end - CHUNK);
        const n = readSync(fd, scratch, 0, end - from, from);
        read += n;
        if (n + carry.length > scratch.length)
            scratch = Buffer.concat([scratch.subarray(0, n), carry], 2 * (n + carry.length));
        else
            carry.copy(scratch, n);
        const buf = scratch.subarray(0, n + carry.length);
        if (last < 0 && buf.includes(NEWLINE))
            last = from + buf.lastIndexOf(NEWLINE) + 1;
        carry = Buffer.alloc(0);
        for (let pos = buf.length; pos > 0 && !stopped;) {
            const nl = buf.lastIndexOf(NEWLINE, pos - 1);
            if (nl < 0 && from > 0) {
                carry = Buffer.from(buf.subarray(0, pos));
                break;
            } // a line cut by the piece's start
            stopped = visit(buf.subarray(nl + 1, pos));
            pos = nl;
        }
    }
    return { read, lastNewline: Math.max(0, last) };
}
