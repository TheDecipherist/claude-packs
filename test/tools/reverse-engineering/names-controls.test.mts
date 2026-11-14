// Review fx-1 findings 3, 4, 16, 17: the chance controls of names-sweep are real chances. Each case goes red with its fix taken out.
import { assert, join, run, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';
import { chanceSource, indexCheck, indexText } from '../../../packs/reverse-engineering/tools/lib/names-index.mts';
import { chanceRuns, widthPrefixedRuns, widthTablesText } from '../../../packs/reverse-engineering/tools/lib/names-runs.mts';
import { xorKeyFromErased, xorWithKey } from '../../../packs/reverse-engineering/tools/lib/unwrap-proofs.mts';

const INSTALL = fixture('cpp');
run(INSTALL, 'add', 'reverse-engineering');
const TOOL = join(INSTALL, '.claude/tools/names-sweep.mjs');

test('the shuffle source has real low bits: its parity is about half and half', () => {
  const next = chanceSource(12345);
  let odd = 0;
  for (let i = 0; i < 10000; i++) odd += next() % 2;
  assert.ok(odd > 4500 && odd < 5500, `odd ${odd} of 10000`);
});

test('one matching name in a hundred, against controls at 0 %, does not locate a table', () => {
  const names = Array.from({ length: 100 }, (_, i) => `Name${String(i).padStart(3, '0')}`);
  const image = Buffer.alloc(100 * 16, 0x80);
  image.write(names[0] ?? '', 0, 'latin1');
  const check = indexCheck(image, names, { at: 0, stride: 16, width: 8 });
  assert.ok(!check.located, 'one name of a hundred');
  assert.match(indexText('t', check), /nothing is located/);
  assert.match(indexText('t', check), /at least/);
});

test('an XOR key is the commonest pair of equal blocks, not the first one, and one pair holds nothing', () => {
  const key = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a]);
  const padding = Buffer.from([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
  const noise = Buffer.from(Array.from({ length: 30 }, (_, i) => (i * 37 + 11) & 0x7f));
  const image = Buffer.concat([padding, noise, xorWithKey(Buffer.alloc(40, 0xff), key)]);
  const found = xorKeyFromErased(image, 5);
  assert.deepEqual(found?.key, key);
  assert.ok((found?.runs ?? 0) >= 2);
  assert.ok(found !== null && !found.global, 'the padding pair is another key, and says so');
  assert.equal(xorKeyFromErased(Buffer.concat([padding, noise]), 5), null, 'one pair is not a key');
});

test('width-prefixed tables are scored against shuffled controls and --min is passed through', () => {
  const table = (w: number, items: string[]): Buffer => Buffer.concat([Buffer.from([w]), Buffer.from(items.map((i) => i.padEnd(w)).join(''), 'latin1')]);
  const image = Buffer.concat([Buffer.from([0, 0, 0]), table(6, ['Sine', 'Saw', 'Square', 'Noise']), table(4, ['Off', 'On', 'Auto'])]);
  assert.ok(chanceRuns(image, 3) < 2, "chance gives fewer tables than the two real ones");
  assert.match(widthTablesText('i', widthPrefixedRuns(image), 0), /shuffled/);
  writeFileSync(join(INSTALL, 'tables-min.bin'), image);
  const some = spawnSync('node', [TOOL, join(INSTALL, 'tables-min.bin'), '--run'], { encoding: 'utf8' });
  assert.equal(some.status, 0, some.stdout);
  assert.match(some.stdout, /shuffled/);
  const none = spawnSync('node', [TOOL, join(INSTALL, 'tables-min.bin'), '--run', '--min', '5'], { encoding: 'utf8' });
  assert.equal(none.status, 1, none.stdout);
});
