// Minimal WAV reader: PCM 16/24/32-bit and IEEE float 32/64. Returns channel 0 as Float64Array.
export function readWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV file');
  let off = 12;
  let fmt = null;
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
      return { sampleRate: fmt.sampleRate, samples: decode(buf, body, Math.min(size, buf.length - body), fmt) };
    }
    off = body + size + (size % 2);
  }
  throw new Error('no data chunk');
}

// One reader per sample encoding: format 3 is IEEE float (64 bit, else 32), any other is integer PCM by bit depth.
const READERS = {
  f32: (buf, p) => buf.readFloatLE(p),
  f64: (buf, p) => buf.readDoubleLE(p),
  i16: (buf, p) => buf.readInt16LE(p) / 32768,
  i24: (buf, p) => buf.readIntLE(p, 3) / 8388608,
  i32: (buf, p) => buf.readInt32LE(p) / 2147483648,
};

function decode(buf, start, size, { format, channels, bits }) {
  const encoding = format === 3 ? (bits === 64 ? 'f64' : 'f32') : `i${bits}`;
  if (!Object.hasOwn(READERS, encoding)) throw new Error(`unsupported bit depth ${bits}`);
  const read = READERS[encoding]; // chosen once, not per sample
  const bytes = bits / 8;
  const frames = Math.floor(size / (bytes * channels));
  const out = new Float64Array(frames);
  for (let i = 0; i < frames; i += 1) out[i] = read(buf, start + i * bytes * channels);
  return out;
}
