// multi-find (reverse-engineering's search lib, KWB-120): every place each of many needles sits in one buffer, in one pass.
// First test for it (W5): it answers what one indexOf per needle answers, on every needle length it files differently.
import { assert, test } from '../../kit-cli.mts';
import { findAll } from '../../../packs/reverse-engineering/tools/lib/multi-find.mts';

/** What searching once per needle gives: the reference answer. Overlapping hits count, as in findAll. */
function plain(buffer: Buffer, needle: Buffer, cap: number): number[] {
  const hits: number[] = [];
  for (let at = buffer.indexOf(needle); at !== -1 && hits.length < cap; at = buffer.indexOf(needle, at + 1)) hits.push(at);
  return hits;
}

const noise = (size: number): Buffer => {
  let seed = 11;
  return Buffer.from(Array.from({ length: size }, () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >> 16) & 0xff; }));
};

test('one, two, three, four and longer needles are each found where a plain search finds them, in order', () => {
  const buffer = noise(4096);
  const needles = ['A', 'Ab', 'Abc', 'Abcd', 'Abcdefgh'].map((s) => Buffer.from(s, 'latin1'));
  [3, 700, 1000, 2000, 4000].forEach((at) => buffer.write('Abcdefgh', at, 'latin1'));
  const got = findAll(buffer, needles, 50);
  needles.forEach((n, i) => assert.deepEqual(got[i], plain(buffer, n, 50), `needle ${n.toString('latin1')}`));
  assert.ok((got[4] ?? []).length >= 5, 'the long needle is found where it was planted');
});

test('a needle that is not there has no hits, and the cap cuts a common one', () => {
  const buffer = Buffer.alloc(1000, 0x61);
  const [absent, common] = findAll(buffer, [Buffer.from('zz'), Buffer.from('aa')], 10);
  assert.deepEqual(absent, []);
  assert.equal(common?.length, 10);
  assert.deepEqual(common, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('the end of the buffer: a needle that would run past it is not a hit', () => {
  const buffer = Buffer.from('xxabcd');
  const [whole, past] = findAll(buffer, [Buffer.from('abcd'), Buffer.from('abcde')], 5);
  assert.deepEqual(whole, [2]);
  assert.deepEqual(past, []);
});

test('thousands of needles over a megabyte come back in one pass, in seconds', () => {
  const buffer = noise(1024 * 1024);
  const needles = Array.from({ length: 3000 }, (_, i) => Buffer.from(`Needle ${i} Level`, 'latin1'));
  buffer.write('Needle 1234 Level', 5000, 'latin1');
  const started = Date.now();
  const got = findAll(buffer, needles, 4);
  assert.ok(Date.now() - started < 10_000, 'one pass, never one search per needle');
  assert.deepEqual(got[1234], [5000]);
  assert.deepEqual(got[0], []);
});
