// 2.0: a per-offset profile of a bank, so an attribution can be checked against the corpus. The planted bank has one
// offset constant, one counting 0..N-1 and one drawn from a fixed pseudo-random sequence; the tool must report that profile.
import { assert, fresh, join, run, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';

const INSTALL = fixture('cpp');
run(INSTALL, 'add', 'reverse-engineering');
const TOOL = join(INSTALL, '.claude/tools/byte-profile.mjs');

const RECORDS = 50;
const SIZE = 4;
/** Offset 0 constant 7, offset 1 counts 0..49, offset 2 cycles through 5 values, offset 3 is a known pseudo-random run. */
function plantedBank(): Buffer {
  const bank = Buffer.alloc(RECORDS * SIZE);
  let state = 12345;
  for (let record = 0; record < RECORDS; record++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    bank[record * SIZE] = 7;
    bank[record * SIZE + 1] = record;
    bank[record * SIZE + 2] = (record % 5) * 10;
    bank[record * SIZE + 3] = (state >> 16) & 0xff;
  }
  return bank;
}

function profileOf(bank: Buffer, extra: readonly string[] = []) {
  const dir = fresh('byte-profile-');
  const file = join(dir, 'bank.bin');
  writeFileSync(file, bank);
  return spawnSync('node', [TOOL, file, String(SIZE), ...extra], { encoding: 'utf8' });
}

const rowOf = (out: string, offset: number): string[] => (out.split('\n')[offset + 1] ?? '').split(',');

test('the tool reports exactly the planted profile', () => {
  const done = profileOf(plantedBank(), ['--csv']);
  assert.equal(done.status, 0);
  assert.deepEqual(rowOf(done.stdout, 0), ['0', '1', '7', '7', '7', '1.000']);
  assert.deepEqual(rowOf(done.stdout, 1), ['1', '50', '0', '49', '0', '0.020']);
  assert.deepEqual(rowOf(done.stdout, 2), ['2', '5', '0', '40', '0', '0.200']);
  const random = rowOf(done.stdout, 3);
  assert.ok(Number(random[1]) > 25, 'the random offset takes many values');
  assert.ok(Number(random[5]) < 0.15, 'no value dominates the random offset');
});

test('a changed plant changes the profile: the test is red without the planted profile', () => {
  const bank = plantedBank();
  for (let record = 0; record < RECORDS; record++) bank[record * SIZE] = record % 2; // offset 0 no longer constant
  const done = profileOf(bank, ['--csv']);
  assert.notDeepEqual(rowOf(done.stdout, 0), ['0', '1', '7', '7', '7', '1.000']);
  assert.deepEqual(rowOf(done.stdout, 0), ['0', '2', '0', '1', '0', '0.500']);
});

test('a bank with no whole record, or no size, is a misuse', () => {
  const dir = fresh('byte-profile-');
  writeFileSync(join(dir, 'short.bin'), Buffer.alloc(2));
  assert.equal(spawnSync('node', [TOOL, join(dir, 'short.bin'), String(SIZE)], { encoding: 'utf8' }).status, 2);
  assert.equal(spawnSync('node', [TOOL], { encoding: 'utf8' }).status, 2);
});
