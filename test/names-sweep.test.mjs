// 0.30.0: a name the manual prints is the fastest way into an image, and the test of every way of unwrapping it. Each image here is built wrapped the way a real one was.
import { assert, cli, existsSync, fresh, join, spawnSync, test, writeFileSync, KIT } from './kit-cli.mjs';
import { interleave, wrappings } from '../packs/reverse-engineering/tools/lib/unwrap.mjs';
import { displayForms, readNames, report, sweep } from '../packs/reverse-engineering/tools/names-sweep.mjs';

const TOOL = join(KIT, 'packs/reverse-engineering/tools/names-sweep.mjs');
const PATCHES = ['Super Saw', 'Glass Keys', 'Deep Bass', 'Soft Pad', 'Hard Sync', 'Bell Tree'];
const names = PATCHES.map((name) => ({ group: 'patch', name }));

// Noise that holds no name, with a bank of records of `stride` bytes laid in at `at`: each record starts with its name.
function imageWithBank(stride = 96, at = 0x400, size = 0x2000) {
  let seed = 7;
  const image = Buffer.from(Array.from({ length: size }, () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return 0x80 | (seed >> 16) & 0x7f; }));
  PATCHES.forEach((p, i) => image.write(p, at + i * stride, 'latin1'));
  return image;
}

const swapped = (b, width) => { const o = Buffer.from(b); for (let i = 0; i + width <= b.length; i += width) for (let k = 0; k < width; k += 1) o[i + k] = b[i + width - 1 - k]; return o; };
function packed7(b) {
  const out = [];
  for (let i = 0; i < b.length; i += 7) {
    const seven = [...b.subarray(i, i + 7)];
    out.push(seven.reduce((h, x, k) => h | (((x >> 7) & 1) << (6 - k)), 0), ...seven.map((x) => x & 0x7f));
  }
  return Buffer.from(out);
}
const nibbles = (b) => Buffer.from([...b].flatMap((x) => [x >> 4, x & 15]));

test('a bank as stored: the stride is the record size, and the manual order holds', () => {
  const r = sweep(imageWithBank(), names);
  assert.equal(r.wrapping, 'as stored');
  assert.equal(r.reads, PATCHES.length);
  const [g] = r.groups;
  assert.equal(g.first, 0x400);
  assert.equal(g.stride.gap, 96);
  assert.deepEqual(g.order, { held: 5, of: 5 });
  assert.deepEqual(r.missing, []);
});

for (const [wrapped, expected, image] of [
  ['high bit set', /high bit set/, () => Buffer.from(imageWithBank().map((x) => x | 0x80))],
  ['16-bit words swapped', /16-bit words swapped/, () => swapped(imageWithBank(), 2)],
  ['24-bit words stored low byte first', /24-bit words reversed/, () => swapped(imageWithBank(), 3)],
  ['32-bit words swapped', /32-bit words reversed/, () => swapped(imageWithBank(), 4)],
  ['7-bit packed sysex', /7-bit packed, high bits first, bit 6-k, from 0/, () => packed7(imageWithBank())],
  ['nibbles', /nibbles, high first, from 0/, () => nibbles(imageWithBank())],
]) {
  test(`a name reads through ${wrapped}, and names the wrapping`, () => {
    const r = sweep(image(), names);
    assert.equal(r.reads, PATCHES.length, JSON.stringify(r.tried.filter((t) => t.reads)));
    assert.match(r.wrapping, expected);
  });
}

test('an OS update: packing restarts at every sysex message, so each one is opened behind its own header', () => {
  const packed = packed7(imageWithBank());
  const header = [0x00, 0x20, 0x29, 0x01, 0x22, 0x7f, 0x7e, 0x00, 0x28];
  const messages = [];
  for (let i = 0; i < packed.length; i += 64) messages.push(Buffer.from([0xf0, ...header, ...packed.subarray(i, i + 64), 0xf7]), Buffer.from([0x00, 0x83, 0x60]));
  const r = sweep(Buffer.concat(messages), names);
  assert.equal(r.reads, PATCHES.length, JSON.stringify(r.tried.filter((t) => t.reads).slice(0, 3)));
  assert.match(r.wrapping, /sysex messages, 9-byte header, 7-bit packed, high bits first, bit 6-k/);
});

test('Roland\'s bit order: the high bits byte first, its bit k for data byte k', () => {
  const data = imageWithBank();
  const out = [];
  for (let i = 0; i < data.length; i += 7) {
    const seven = [...data.subarray(i, i + 7)];
    out.push(seven.reduce((h, x, k) => h | (((x >> 7) & 1) << k), 0), ...seven.map((x) => x & 0x7f));
  }
  const r = sweep(Buffer.from(out), names);
  assert.equal(r.reads, PATCHES.length);
  assert.match(r.wrapping, /high bits first, bit k, from 0/);
});

test('a short last group and a checksum: every byte comes back, so nothing after them shifts', () => {
  const data = Buffer.from(Array.from({ length: 100 }, (_, i) => (i * 37 + 5) & 255));
  const messages = [];
  for (let at = 0; at < data.length; at += 45) {
    const chunk = data.subarray(at, at + 45);
    const body = [];
    for (let i = 0; i < chunk.length; i += 7) {
      const seven = [...chunk.subarray(i, i + 7)];
      body.push(seven.reduce((h, x, k) => h | (((x >> 7) & 1) << k), 0), ...seven.map((x) => x & 0x7f));
    }
    messages.push(Buffer.from([0xf0, 0x41, 0x10, 0x12, ...body, 0x55, 0xf7]));
  }
  const open = wrappings().find((w) => w.name === 'sysex messages, 3-byte header, 7-bit packed, high bits first, bit k, checksum last').open;
  assert.deepEqual([...open(Buffer.concat(messages))], [...data]);
});

test('a display does not print what a manual prints: squeezed, and cut to a column', () => {
  assert.ok(displayForms('Decay Time').includes('decaytime'));
  assert.ok(displayForms('Filter Balance').includes('filterbalanc'));
  assert.ok(!displayForms('Filter Balance').includes('filter'), 'a cut too short matches by chance');
  const image = imageWithBank();
  ['FilterBalanc 4A1', 'Decaytime    1B3', 'OscillatorVo 2A3'].forEach((t, i) => image.write(t, 0x1000 + i * 16, 'latin1'));
  const printed = ['Filter Balance', 'Decay Time', 'Oscillator Volume'].map((name) => ({ group: 'parameter', name }));
  const r = sweep(image, printed);
  assert.equal(r.reads, 3);
  assert.equal(r.groups[0].stride.gap, 16);
});

test('names in one unbroken run are a pool, to be read whole', () => {
  const image = imageWithBank();
  image.write('Off     Sine    Triangle  Sawtooth', 0x1200, 'latin1');
  const [g] = sweep(image, ['Sine', 'Triangle', 'Sawtooth'].map((name) => ({ group: 'wave', name })), {}).groups;
  assert.deepEqual([g.pool.hits, g.pool.from], [3, 0x1200]);
});

test('one name reading proves nothing: chance does that', () => {
  const image = imageWithBank();
  const wanted = [{ group: 'patch', name: 'Super Saw' }, ...Array.from({ length: 19 }, (_, i) => ({ group: 'patch', name: `Absent Name ${i}` }))];
  const r = sweep(image, wanted);
  assert.equal(r.proven, false);
  assert.match(report('rom', r), /only 1 of 20 names read, which chance can do/);
});

test('an EPROM pair: neither half reads alone, the interleave does', () => {
  const whole = imageWithBank();
  const even = Buffer.from(whole.filter((_, i) => i % 2 === 0));
  const odd = Buffer.from(whole.filter((_, i) => i % 2 === 1));
  assert.equal(sweep(even, names).wrapping, null);
  assert.equal(sweep(interleave(even, odd), names).wrapping, 'as stored');
});

test('a custom character set: the letters keep their distances', () => {
  const image = imageWithBank();
  PATCHES.forEach((p, i) => { for (let k = 0; k < p.length; k += 1) image[0x400 + i * 96 + k] = (p.charCodeAt(k) + 0x31) & 255; });
  const r = sweep(image, names.filter((n) => n.name.length >= 6));
  assert.match(r.wrapping, /custom character set, shift 49/);
});

test('a table of pointers is found, and the entries past the manual list are shown', () => {
  const image = imageWithBank();
  PATCHES.forEach((_, i) => image.writeUInt16BE(0x8000 + 0x400 + i * 96, 0x100 + i * 2));
  image.write('\0Unlisted One\0', 0x400 + 5 * 96 + 9, 'latin1');
  const [g] = sweep(image, names, { bases: [0, 0x8000] }).groups;
  assert.deepEqual([g.pointers.at, g.pointers.entries, g.pointers.base], [0x100, 6, 0x8000]);
  assert.deepEqual(g.next, ['Unlisted One']);
});

test('no name reads: it fails, and says what it searched rather than that the machine has no text', () => {
  const dir = fresh('ns-');
  writeFileSync(join(dir, 'rom.bin'), Buffer.alloc(4096, 0xff));
  writeFileSync(join(dir, 'names.txt'), '# from the manual\npatch\tSuper Saw\n');
  const r = spawnSync('node', [TOOL, join(dir, 'rom.bin'), '--names', join(dir, 'names.txt')], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /none of 1 names reads under any of \d+ wrappings/);
  assert.match(r.stdout, /7-bit packed/);
  assert.match(r.stdout, /says nothing about what the machine holds/);
});

test('the names file keeps groups, and a name too short to mean anything is dropped', () => {
  assert.deepEqual(readNames('# x\npatch\tSuper Saw\nSaw\nreverb\tGold Plate\nDelay\n'), [{ group: 'patch', name: 'Super Saw' }, { group: 'reverb', name: 'Gold Plate' }, { group: 'name', name: 'Delay' }]);
  assert.match(report('rom', sweep(imageWithBank(), names)), /6 of 6 names read as stored.*\n {2}patch: 6 of 6, 0x400\.\.0x5E0; stride 96 \(5 of 5 gaps\)/);
});

test('the tool, the skill and the rule install with the pack, and a project can run it', () => {
  const dir = fresh('ns-install-');
  assert.equal(cli(dir, 'init', 'reverse-engineering', '--config', 'cpp').status, 0);
  for (const f of ['tools/names-sweep.mjs', 'tools/lib/unwrap.mjs', 'rules/names-before-code.md', 'skills/names-first/SKILL.md', 'skills/menu-map/SKILL.md']) assert.ok(existsSync(join(dir, '.claude', f)), f);
  writeFileSync(join(dir, 'rom.bin'), imageWithBank());
  writeFileSync(join(dir, 'names.txt'), PATCHES.join('\n'));
  const r = spawnSync('node', [join(dir, '.claude/tools/names-sweep.mjs'), join(dir, 'rom.bin'), '--names', join(dir, 'names.txt')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
