// Width-prefixed name tables count themselves: a width byte, N fields of that width, then the next table's width byte, with no count and no terminator.
// The distance divided by the width is the entry count, proved without a descriptor. names-sweep.mjs --run prints each table's offset, width, count and entries.
//   widthPrefixedRuns(buffer, minCount) -> [{ at, width, count, entries }]
//   chanceRuns(buffer, minCount) -> the mean count of such tables in shuffled copies of the same bytes: what chance gives
//   widthTablesText(label, runs, chance) -> the text names-sweep prints

import { chanceSource } from './names-index.mts';

/** One width-prefixed table: where its width byte sits, the width, how many fields it holds, and the fields. */
export interface Run { at: number; width: number; count: number; entries: string[] }

const MIN_WIDTH = 2;
const MAX_WIDTH = 0x1f; // below a space, so a width byte is never text
const printable = (x: number): boolean => x >= 0x20 && x < 0x7f;

export function widthPrefixedRuns(buffer: Buffer, minCount = 3): Run[] {
  const runs: Run[] = [];
  for (let i = 0; i < buffer.length; i += 1) {
    const width = buffer[i] ?? 0;
    if (width < MIN_WIDTH || width > MAX_WIDTH) continue;
    let end = i + 1;
    while (end < buffer.length && printable(buffer[end] ?? 0)) end += 1;
    const length = end - i - 1;
    if (length < width * minCount || length % width !== 0) continue;
    const entries = Array.from({ length: length / width }, (_, k) => buffer.toString('latin1', i + 1 + k * width, i + 1 + (k + 1) * width).trimEnd());
    runs.push({ at: i, width, count: entries.length, entries });
    i = end - 1;
  }
  return runs;
}

const CHANCE_SHUFFLES = 20;

/** The mean number of tables found in shuffled copies of the image (same bytes, same printable share): a length divisible by its width is 1 in `width` by chance. */
export function chanceRuns(buffer: Buffer, minCount = 3): number {
  const next = chanceSource(4242);
  let total = 0;
  for (let n = 0; n < CHANCE_SHUFFLES; n += 1) {
    const copy = Buffer.from(buffer);
    for (let i = copy.length - 1; i > 0; i -= 1) { const j = next() % (i + 1); const t = copy[i] ?? 0; copy[i] = copy[j] ?? 0; copy[j] = t; }
    total += widthPrefixedRuns(copy, minCount).length;
  }
  return total / CHANCE_SHUFFLES;
}

export function widthTablesText(label: string, runs: readonly Run[], chance = 0): string {
  if (!runs.length) return `${label}: no width-prefixed table found (a width byte below 0x20, then fields of that width, then the next width byte)`;
  const rows = runs.map((r, id) => `  ${id}: 0x${r.at.toString(16)} width ${r.width}, ${r.count} entries: ${r.entries.slice(0, 6).join(' | ')}${r.count > 6 ? ' ...' : ''}`);
  return [`${label}: ${runs.length} width-prefixed tables, each count is its length divided by its width`, ...rows,
    `  chance: ${chance.toFixed(1)} tables on average in shuffled copies of the same bytes (${CHANCE_SHUFFLES} shuffles); ${runs.length > chance ? 'more than chance gives' : 'no more than chance gives, so nothing is proved'}`].join('\n');
}
