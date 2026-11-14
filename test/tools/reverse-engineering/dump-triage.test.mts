// 2.0 audit U1: say what an image is and whether it is whole. A planted image (made here, in a temp folder) has a stuck
// address line; a healthy random image has none, and an over-read one repeats.
import { KIT, assert, fresh, join, readFileSync, run, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';

const INSTALL = fixture('cpp');
run(INSTALL, 'add', 'reverse-engineering');
const TOOL = join(INSTALL, '.claude/tools/dump-triage.mjs');
const SIZE = 65536;

/** The same bytes every run: a small xorshift stream. */
function random(): Uint8Array {
  const bytes = new Uint8Array(SIZE);
  let x = 0x2545f491;
  for (let i = 0; i < SIZE; i++) {
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    bytes[i] = x & 0xff;
  }
  return bytes;
}

/** Address line `line` stuck: every byte with that address bit set reads as its partner with the bit clear. */
function stick(bytes: Uint8Array, line: number): Uint8Array {
  for (let i = 0; i < bytes.length; i++) if (i & (1 << line)) bytes[i] = bytes[i ^ (1 << line)] ?? 0;
  return bytes;
}

function triage(bytes: Uint8Array) {
  const file = join(fresh('triage-'), 'image.bin');
  writeFileSync(file, bytes);
  return spawnSync('node', [TOOL, file], { encoding: 'utf8' });
}

test('a stuck address line is named by its line and mask', () => {
  const done = triage(stick(random(), 5));
  assert.equal(done.status, 1, done.stdout);
  assert.match(done.stdout, /stuck address line A5 \(mask 0x20\): b\[i\] == b\[i\^mask\] for 100\.0 % of pairs/);
  assert.doesNotMatch(done.stdout, /stuck address line A[^5]/);
});

test('a healthy random image reports no stuck line', () => {
  const done = triage(random());
  assert.doesNotMatch(done.stdout, /stuck address line/);
});

test('an over-read image repeats its real size, and a blank half is named', () => {
  const real = random().subarray(0, 8192);
  const over = new Uint8Array(SIZE);
  for (let i = 0; i < SIZE; i++) over[i] = real[i % 8192] ?? 0;
  const out = triage(over).stdout;
  assert.match(out, /lower half repeats every 8192 bytes/);
  const blank = random();
  blank.fill(0xff, SIZE / 2);
  assert.match(triage(blank).stdout, /upper half is blank/);
});

test('the census sums to 100 % and a window with no 0x00 byte is counted', () => {
  const out = triage(random()).stdout;
  const shares = [...out.matchAll(/(?:erased|flat random|text|other) ([\d.]+) %/g)].map((m) => Number(m[1]));
  assert.equal(shares.length, 4);
  assert.ok(Math.abs(shares.reduce((a, b) => a + b, 0) - 100) < 0.5, out);
  const noZero = random().map((b) => b || 1);
  assert.match(triage(noZero).stdout, /windows of 4096 bytes hold no 0x00 byte/);
});

test('the skill names the tool and its laws', () => {
  const skill = readFileSync(join(KIT, 'packs/reverse-engineering/skills/triage-the-dump/SKILL.md'), 'utf8');
  assert.ok(skill.length < 8000);
  assert.match(skill, /^description: Use when/m);
  assert.match(skill, /node \.claude\/tools\/dump-triage\.mjs/);
});

// Review fx-1 findings 1, 2, 15, 21.
test('a flat random image is a finding: windows are judged by the threshold the census uses', () => {
  const done = triage(random());
  assert.equal(done.status, 1, done.stdout);
  assert.match(done.stdout, /windows at 7\.9 or more bits per byte: encrypted or compressed/);
  assert.doesNotMatch(done.stdout, /flat random 0\.0 %/);
});

test('--window must be a whole number of at least 1: 0, negative and fractional are refused with exit 2', () => {
  const file = join(fresh('triage-w-'), 'image.bin');
  writeFileSync(file, random());
  for (const bad of ['-5', '0', '1.5', 'x']) {
    const done = spawnSync('node', [TOOL, file, '--window', bad], { encoding: 'utf8', timeout: 5000 });
    assert.equal(done.status, 2, `--window ${bad}: ${done.stdout}${done.stderr}`);
  }
});

test('the period search is linear: a long run of one byte with a different last byte is judged at once', () => {
  const bytes = new Uint8Array(1 << 18).fill(0xff);
  bytes[bytes.length - 1] = 0;
  const file = join(fresh('triage-p-'), 'image.bin');
  writeFileSync(file, bytes);
  const done = spawnSync('node', [TOOL, file], { encoding: 'utf8', timeout: 2500 });
  assert.equal(done.status, 1, `${done.error ?? ''}${done.stdout}`);
  const small = new Uint8Array(24);
  for (let i = 0; i < 24; i++) small[i] = [1, 2, 3][i % 3] ?? 0;
  assert.match(triage(small).stdout, /lower half repeats every 3 bytes/);
});

test('a window of text, which has no 0x00 byte either, is not "not plain 8-bit code"', () => {
  const text = new Uint8Array(8192);
  for (let i = 0; i < text.length; i++) text[i] = 0x61 + ((i * 7 + (i >> 3)) % 26);
  assert.doesNotMatch(triage(text).stdout, /hold no 0x00/);
});
