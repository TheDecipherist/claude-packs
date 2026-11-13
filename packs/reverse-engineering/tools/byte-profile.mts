// Profile a bank of fixed-size records, offset by offset: for each offset its distinct values, min, max, most common
// value and that value's share of the records, so every attribution can be checked against the corpus.
//   node .claude/tools/byte-profile.mjs <bank file> <record size> [--csv]
// Prints one line per offset (a header first); `--csv` prints comma-separated rows. Bytes past the last whole record are
// ignored and said so. Exit 0: profiled. Exit 2: the command was used wrongly or the bank holds no whole record.
import { readFileSync } from 'node:fs';
import { isMain } from '../hooks/lib/hook-log.mts';

/** One offset's profile across the bank. */
export interface OffsetProfile { offset: number; distinct: number; min: number; max: number; mode: number; share: number }

/** The profile of every offset of a bank cut into records of `size` bytes. */
export function profile(bank: Uint8Array, size: number): OffsetProfile[] {
  const records = Math.floor(bank.length / size);
  const rows: OffsetProfile[] = [];
  for (let offset = 0; offset < size; offset++) {
    const counts = new Map<number, number>();
    for (let record = 0; record < records; record++) {
      const value = bank[record * size + offset] ?? 0;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const values = [...counts.keys()];
    const mode = [...counts].reduce((best, entry) => (entry[1] > best[1] || (entry[1] === best[1] && entry[0] < best[0]) ? entry : best));
    rows.push({ offset, distinct: values.length, min: Math.min(...values), max: Math.max(...values), mode: mode[0], share: mode[1] / records });
  }
  return rows;
}

const HEADER = ['offset', 'distinct', 'min', 'max', 'mode', 'share'];

/** The rows as text: tab-aligned columns, or CSV. */
export function render(rows: readonly OffsetProfile[], csv: boolean): string {
  const lines = rows.map((row) => [row.offset, row.distinct, row.min, row.max, row.mode, row.share.toFixed(3)].join(csv ? ',' : '\t'));
  return [HEADER.join(csv ? ',' : '\t'), ...lines].join('\n');
}

function main(args: readonly string[]): number {
  const csv = args.includes('--csv');
  const [file, sizeText] = args.filter((arg) => arg !== '--csv');
  const size = Number(sizeText);
  if (file === undefined || !Number.isInteger(size) || size < 1) {
    console.error('usage: node .claude/tools/byte-profile.mjs <bank file> <record size> [--csv]');
    return 2;
  }
  const bank = readFileSync(file);
  if (bank.length < size) {
    console.error(`byte-profile: ${file} holds no whole record of ${size} bytes`);
    return 2;
  }
  const spare = bank.length % size;
  if (spare > 0) console.error(`byte-profile: ${spare} bytes past the last whole record are ignored`);
  console.log(render(profile(bank, size), csv));
  return 0;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
