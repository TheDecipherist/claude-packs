// E8 and E18: names-sweep's --run and --index modes, and the unwrap modes added to it. Each image is built wrapped the way a real one was, and every case
// goes red when its mode is taken out of the tool.
import { assert, join, run, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';
import { wrappings } from '../../../packs/reverse-engineering/tools/lib/unwrap.mts';
import { checksumSpans, oneBlockPerFile, payloadStarts, rolandChecksumOk, strideProves, unpackedLength, xorKeyFromErased, xorWithKey } from '../../../packs/reverse-engineering/tools/lib/unwrap-proofs.mts';
import { indexCheck } from '../../../packs/reverse-engineering/tools/lib/names-index.mts';
import { widthPrefixedRuns } from '../../../packs/reverse-engineering/tools/lib/names-runs.mts';
import { sweep } from '../../../packs/reverse-engineering/tools/lib/names-report.mts';
import { PATCHES, imageWithBank, names, packed7 } from './names-fixtures.mts';

const INSTALL = fixture('cpp');
run(INSTALL, 'add', 'reverse-engineering');
const TOOL = join(INSTALL, '.claude/tools/names-sweep.mjs');

const swapNibbles = (b: Buffer): Buffer => Buffer.from(b.map((x) => ((x & 15) << 4) | (x >> 4)));
function clavia(b: Buffer): Buffer {
  const out: number[] = [];
  for (let i = 0; i < b.length; i += 7) {
    const seven = [...b.subarray(i, i + 7)];
    out.push(seven.reduce((f, x, k) => f | ((x & 1) << k), 0), ...seven.map((x) => x >> 1));
  }
  return Buffer.from(out);
}
const everyThirdWord = (b: Buffer): Buffer => Buffer.from([...b].flatMap((x) => [x, 0x80, 0x80]));
function swapLines(b: Buffer, a: number, c: number): Buffer {
  const o = Buffer.from(b);
  for (let i = 0; i < b.length; i += 1) o[i] = b[((i >> a) & 1) === ((i >> c) & 1) ? i : i ^ ((1 << a) | (1 << c))] ?? 0;
  return o;
}
function smf(data: Buffer): Buffer {
  const events: number[] = [0x4d, 0x54, 0x68, 0x64];
  for (let i = 0; i < data.length; i += 96) {
    const body = [...data.subarray(i, i + 96), 0xf7];
    events.push(0x00, 0xf0, body.length, ...body);
  }
  return Buffer.from(events);
}

const NEW_MODES: readonly (readonly [string, RegExp, () => Buffer])[] = [
  ['nibble-swapped ASCII', /nibbles swapped within each byte/, () => swapNibbles(imageWithBank())],
  ['a Clavia 8-in-7 with the low bits in a flag byte', /flag byte first holding each byte's low bit, from 0/, () => clavia(Buffer.from(imageWithBank().map((x) => x & 0x7f)))],
  ['one character per 24-bit word', /one byte per 24-bit word, from 0/, () => everyThirdWord(Buffer.from(imageWithBank().map((x) => x & 0x7f)))],
  ['address lines A2 and A3 swapped', /address lines A2 and A3 swapped/, () => swapLines(imageWithBank(), 2, 3)],
  ['a standard MIDI file of sysex events, 7-bit packed', /SMF sysex events, 0-byte header, 7-bit packed, high bits first, bit 6-k/, () => smf(packed7(imageWithBank()))],
];
for (const [wrapped, expect, build] of NEW_MODES) {
  test(`a name reads through ${wrapped}, and names the wrapping`, () => {
    const r = sweep(build(), names);
    assert.equal(r.reads, PATCHES.length, wrapped);
    assert.match(r.wrapping ?? '', expect);
    assert.ok(wrappings().some((w) => expect.test(w.name)), 'the wrapping is in the list');
  });
}

test('a packing is proved by its address stride and its checksum', () => {
  assert.equal(unpackedLength(244), 213);
  assert.ok(strideProves(244, 213));
  assert.ok(!strideProves(244, 214));
  assert.ok(rolandChecksumOk([0x10, 0x20, 0x30, 128 - ((0x10 + 0x20 + 0x30) % 128)]));
  assert.ok(!rolandChecksumOk([0x10, 0x20, 0x30, 1]));
});

test('a header sum pins where the payload starts, and a record sum may run one word past its length', () => {
  const payload = Buffer.from([1, 2, 3, 4, 5]);
  assert.deepEqual(payloadStarts(Buffer.concat([Buffer.from([9, 8, 7, 6]), payload]), 15).slice(0, 1), [4]);
  assert.deepEqual(checksumSpans([10, 20, 30, 40], 100), [4]);
  assert.deepEqual(checksumSpans([10, 20, 30, 40], 60), [3]);
  assert.equal(oneBlockPerFile(Buffer.alloc(10, 1), 8).length, 8);
});

test('an XOR key is read from an erased run, and holds at the other runs', () => {
  const key = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a]);
  const image = Buffer.concat([Buffer.alloc(40, 0xff), imageWithBank().subarray(0, 60), Buffer.alloc(40, 0xff)]);
  const wrapped = xorWithKey(image, key);
  const found = xorKeyFromErased(wrapped, 5);
  assert.deepEqual(found?.key, key);
  assert.ok(found?.global);
  assert.deepEqual(xorWithKey(wrapped, key), image);
});

test('--run: width-prefixed tables count themselves', () => {
  const table = (w: number, items: string[]): Buffer => Buffer.concat([Buffer.from([w]), Buffer.from(items.map((i) => i.padEnd(w)).join(''), 'latin1')]);
  const image = Buffer.concat([Buffer.from([0, 0, 0]), table(6, ['Sine', 'Saw', 'Square', 'Noise']), table(4, ['Off', 'On', 'Auto'])]);
  assert.deepEqual(widthPrefixedRuns(image).map((r) => [r.width, r.count]), [[6, 4], [4, 3]]);
  writeFileSync(join(INSTALL, 'tables.bin'), image);
  const r = spawnSync('node', [TOOL, join(INSTALL, 'tables.bin'), '--run'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /2 width-prefixed tables/);
});

test('--index: a table is located only when the true alignment beats every control', () => {
  const image = imageWithBank(32, 0x100);
  const found = indexCheck(image, PATCHES, { at: 0x100, stride: 32, width: 9 });
  assert.ok(found.located, 'the true alignment must beat every control');
  assert.ok(found.controls.some((c) => /shuffled/.test(c.name)));
  assert.ok(!indexCheck(image, PATCHES, { at: 0x100 + 32, stride: 32, width: 9 }).located, 'a shifted table is not located');
  writeFileSync(join(INSTALL, 'idx.bin'), image);
  writeFileSync(join(INSTALL, 'idx.txt'), PATCHES.join('\n'));
  const r = spawnSync('node', [TOOL, join(INSTALL, 'idx.bin'), '--names', join(INSTALL, 'idx.txt'), '--index', '256,32,9'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
