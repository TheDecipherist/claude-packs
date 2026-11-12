// frame-gather: bytes of a framed message (proxy-wire: [u32 n, big-endian][n bytes], `frames` of them) collected as they arrive, and
// joined only when decoding can learn something new: the length of the next frame is readable, or the whole message is in. A 64 MB
// stdin comes in about a thousand chunks; joining them per chunk copied about 30 GB on the daemon's main thread (W10b finding 11).
// A frame longer than `max` is handed over at once, so the decoder can refuse it before its bytes arrive.
export class FrameGather {
    /** How many times the chunks were joined into one buffer: three at most for a two-frame message. */
    joins = 0;
    /** Bytes taken so far. */
    length = 0;
    chunks = [];
    wanted = 4;
    frames;
    max;
    constructor(frames, max) { this.frames = frames; this.max = max; }
    /** The bytes so far, joined, when the decoder should look again; null when it would learn nothing. */
    push(chunk) {
        this.chunks.push(chunk);
        this.length += chunk.length;
        if (this.length < this.wanted)
            return null;
        this.joins += 1;
        const all = this.chunks.length === 1 ? (this.chunks[0] ?? Buffer.alloc(0)) : Buffer.concat(this.chunks);
        this.chunks = [all];
        let at = 0;
        for (let i = 0; i < this.frames; i += 1) {
            if (all.length < at + 4) {
                this.wanted = at + 4;
                return all;
            }
            const n = all.readUInt32BE(at);
            if (n > this.max)
                return all;
            at += 4 + n;
        }
        this.wanted = at;
        return all.length >= at ? all : null;
    }
}
