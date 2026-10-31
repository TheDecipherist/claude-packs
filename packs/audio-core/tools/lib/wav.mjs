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

function decode(buf, start, size, { format, channels, bits }) {
  const bytes = bits / 8;
  const frames = Math.floor(size / (bytes * channels));
  const out = new Float64Array(frames);
  for (let i = 0; i < frames; i += 1) {
    const p = start + i * bytes * channels;
    if (format === 3) out[i] = bits === 64 ? buf.readDoubleLE(p) : buf.readFloatLE(p);
    else if (bits === 16) out[i] = buf.readInt16LE(p) / 32768;
    else if (bits === 24) out[i] = buf.readIntLE(p, 3) / 8388608;
    else if (bits === 32) out[i] = buf.readInt32LE(p) / 2147483648;
    else throw new Error(`unsupported bit depth ${bits}`);
  }
  return out;
}
