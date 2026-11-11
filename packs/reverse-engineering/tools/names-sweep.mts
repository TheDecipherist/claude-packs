// The fastest way into a firmware image or a dump: search it for the names the manual prints. Patch names, arp patterns, delay and reverb programs, menus,
// parameters. One name gives a table, the table's stride gives a record size, its order gives the parameter order, and what points at it leads to the code.
//   node names-sweep.mjs <image> [<image>...] --names <file> [--pair] [--base 0x8000,...] [--banked] [--min 4] [--json]
// The names file has one name per line, `group<TAB>name` to keep kinds apart (patch, arp, reverb, menu, parameter), `#` for a comment.
// --pair reads two images as one interleaved EPROM pair. Every wrapping in lib/unwrap.mjs is tried, and the one that reads the most names wins.
// Names reading prove the unwrapping. Exit 1 when too few read under any wrapping, and the report says what was searched.
// This file is the command line. The searching is lib/names-find.mjs, what the hits say about the image is lib/names-tables.mjs, and the sweep
// over every wrapping with its report is lib/names-report.mjs (which a test reads without starting a command).
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';
import { readNames } from './lib/names-find.mts';
import { report, sweep } from './lib/names-report.mts';
import type { Sweep } from './lib/names-report.mts';
import { interleave } from './lib/unwrap.mts';

// A CPU sees a bank of a larger ROM through a window, so an address is the file offset less the bank plus the window: every plausible pairing, as a base.
const BANK_STEP = 0x4000;
const WINDOWS = [0x0000, 0x4000, 0x8000, 0xc000];
function bankedBases(size: number): number[] {
  const bases = new Set([0]);
  for (let bank = 0; bank < size; bank += BANK_STEP) for (const window of WINDOWS) bases.add(window - bank);
  return [...bases];
}

function imagesOf(files: readonly string[], pair: boolean): [string, Buffer][] {
  const [one, two] = files;
  if (pair && one !== undefined && two !== undefined) return [[`${basename(one)}+${basename(two)}`, interleave(readFileSync(one), readFileSync(two))]];
  return files.map((f): [string, Buffer] => [basename(f), readFileSync(f)]);
}

function main(argv: readonly string[]): number {
  const value = (flag: string): string | undefined => { const i = argv.indexOf(flag); return i === -1 ? undefined : argv[i + 1]; };
  const files = argv.filter((a, i) => !a.startsWith('--') && !['--names', '--base', '--min'].includes(argv[i - 1] ?? ''));
  const namesFile = value('--names');
  if (!files.length || !namesFile) {
    console.error('usage: names-sweep.mjs <image>... --names <file> [--pair] [--base 0x8000,...] [--banked] [--min 4] [--json]');
    return 2;
  }
  const names = readNames(readFileSync(namesFile, 'utf8'), Number(value('--min') ?? 4));
  const given = (value('--base') ?? '0').split(',').map((b) => Number.parseInt(b));
  const basesFor = (image: Buffer): number[] => (argv.includes('--banked') ? bankedBases(image.length) : given);
  const results = imagesOf(files, argv.includes('--pair')).map(([label, image]): [string, Sweep] => [label, sweep(image, names, { bases: basesFor(image) })]);
  console.log(argv.includes('--json') ? JSON.stringify(Object.fromEntries(results), null, 2) : results.map(([label, r]) => report(label, r)).join('\n\n'));
  return results.some(([, r]) => r.proven) ? 0 : 1;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
