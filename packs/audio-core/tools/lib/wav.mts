// Minimal WAV reader: PCM 16/24/32-bit and IEEE float 32/64. Returns channel 0 as `samples` (Float64Array), and every
// channel as `channels`.

/** A WAV file's samples: the sample rate, channel 0 and every channel. */
export interface Wav { sampleRate: number; samples: Float64Array; channels: Float64Array[] }

interface Format { format: number; channels: number; sampleRate: number; bits: number }

export function readWav(buf: Buffer): Wav {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV file');
  let off = 12;
  let fmt: Format | null = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === 'fmt ') {
      let format = buf.readUInt16LE(body);
      if (format === 0xfffe) format = buf.readUInt16LE(body + 24); // WAVE_FORMAT_EXTENSIBLE sub-format
      fmt = { format, channels: buf.readUInt16LE(body + 2), sampleRate: buf.readUInt32LE(body + 4), bits: buf.readUInt16LE(body + 14) };
    } else if (id === 'data') {
      if (!fmt) throw new Error('data chunk before fmt chunk');
      const channels = decode(buf, body, Math.min(size, buf.length - body), fmt);
      return { sampleRate: fmt.sampleRate, samples: channels[0] ?? new Float64Array(0), channels };
    }
    off = body + size + (size % 2);
  }
  throw new Error('no data chunk');
}

type SampleReader = (buf: Buffer, at: number) => number;

// One reader per sample encoding: format 3 is IEEE float (64 bit, else 32), any other is integer PCM by bit depth.
const READERS: Readonly<Record<string, SampleReader>> = {
  f32: (buf, p) => buf.readFloatLE(p),
  f64: (buf, p) => buf.readDoubleLE(p),
  i16: (buf, p) => buf.readInt16LE(p) / 32768,
  i24: (buf, p) => buf.readIntLE(p, 3) / 8388608,
  i32: (buf, p) => buf.readInt32LE(p) / 2147483648,
};

function decode(buf: Buffer, start: number, size: number, { format, channels, bits }: Format): Float64Array[] {
  const encoding = format === 3 ? (bits === 64 ? 'f64' : 'f32') : `i${bits}`;
  const read = Object.hasOwn(READERS, encoding) ? READERS[encoding] : undefined; // chosen once, not per sample
  if (!read) throw new Error(`unsupported bit depth ${bits}`);
  const bytes = bits / 8;
  const frames = Math.floor(size / (bytes * channels));
  const out = Array.from({ length: channels }, () => new Float64Array(frames));
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) (out[c] as Float64Array)[i] = read(buf, start + (i * channels + c) * bytes);
  }
  return out;
}

// A 32-bit float WAV of the given channels (each a Float64Array or array of samples, one length).
export function writeWav(channels: readonly ArrayLike<number>[], sampleRate: number): Buffer {
  const frames = channels[0]?.length ?? 0;
  const data = Buffer.alloc(frames * channels.length * 4);
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels.length; c += 1) data.writeFloatLE((channels[c] as ArrayLike<number>)[i] ?? 0, (i * channels.length + c) * 4);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0, 'ascii'); head.writeUInt32LE(36 + data.length, 4); head.write('WAVEfmt ', 8, 'ascii');
  head.writeUInt32LE(16, 16); head.writeUInt16LE(3, 20); head.writeUInt16LE(channels.length, 22); head.writeUInt32LE(sampleRate, 24);
  head.writeUInt32LE(sampleRate * channels.length * 4, 28); head.writeUInt16LE(channels.length * 4, 32); head.writeUInt16LE(32, 34);
  head.write('data', 36, 'ascii'); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}
