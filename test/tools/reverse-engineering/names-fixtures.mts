// The images the names-sweep tests build: noise with a bank of named records laid in, and the wrappings that hide it.
export const PATCHES = ['Super Saw', 'Glass Keys', 'Deep Bass', 'Soft Pad', 'Hard Sync', 'Bell Tree'];
export const names = PATCHES.map((name) => ({ group: 'patch', name }));

// Noise that holds no name, with a bank of records of `stride` bytes laid in at `at`: each record starts with its name.
export function imageWithBank(stride = 96, at = 0x400, size = 0x2000): Buffer {
  let seed = 7;
  const image = Buffer.from(Array.from({ length: size }, () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return 0x80 | (seed >> 16) & 0x7f; }));
  PATCHES.forEach((p, i) => image.write(p, at + i * stride, 'latin1'));
  return image;
}

export function packed7(b: Buffer): Buffer {
  const out: number[] = [];
  for (let i = 0; i < b.length; i += 7) {
    const seven = [...b.subarray(i, i + 7)];
    out.push(seven.reduce((h, x, k) => h | (((x >> 7) & 1) << (6 - k)), 0), ...seven.map((x) => x & 0x7f));
  }
  return Buffer.from(out);
}
