// resident/options: the daemon's command line, read once through one table and written again from the same table (W10b finding 7). A
// re-exec (24 hours old, 400 MB) starts the daemon with every flag it was given, so a tuned daemon stays tuned and a flag added here is
// parsed and carried by this row alone. `--ready-fd` is the one row a re-exec leaves out: the pipe it names is the first start's.
import { WIRE } from '../lib/proxy-wire-table.mts';

/** At most this many workers import any one hook while the pool is not full (W8.4); doctor lets each hook this many cold calls after a start (one per worker). */
export const SPREAD = 4;

export interface FlagRow {
  flag: string;
  /** Whether the flag takes a value (`--pool 4`) or stands alone (`--no-npm`). */
  value: boolean;
  /** Whether a re-exec passes it on. */
  again: boolean;
}

export const FLAGS: readonly FlagRow[] = [
  { flag: WIRE.flag.hooks, value: true, again: true },
  { flag: '--pool', value: true, again: true },
  { flag: '--idle-minutes', value: true, again: true },
  { flag: '--exit-with', value: true, again: true },
  { flag: '--max-rss-mb', value: true, again: true },
  { flag: '--recycle-after', value: true, again: true },
  { flag: '--state-ms', value: true, again: true },
  { flag: '--sample-ms', value: true, again: true },
  { flag: '--watchdog-ms', value: true, again: true },
  { flag: '--test-ms', value: true, again: true },
  { flag: WIRE.flag.proxy, value: true, again: true },
  { flag: '--no-npm', value: false, again: true },
  { flag: WIRE.flag.readyFd, value: true, again: false },
];

/** The flags a command line gave, by name: the value, or `true` for a flag that stands alone. A flag at the end with no value is not given. */
export type Given = ReadonlyMap<string, string | true>;

export function givenOf(argv: readonly string[]): Given {
  const given = new Map<string, string | true>();
  for (const row of FLAGS) {
    const i = argv.indexOf(row.flag);
    if (i < 0) continue;
    if (!row.value) given.set(row.flag, true);
    else if (argv[i + 1] !== undefined) given.set(row.flag, argv[i + 1] ?? '');
  }
  return given;
}

/** A positive number from a flag, else `otherwise`. */
export const numberOf = (given: Given, flag: string, otherwise: number): number => {
  const v = Number(given.get(flag));
  return Number.isFinite(v) && v > 0 ? v : otherwise;
};
export const textOf = (given: Given, flag: string): string | undefined => { const v = given.get(flag); return typeof v === 'string' ? v : undefined; };

/** The arguments that start this same daemon again: its script, `--serve <project>`, and every flag it was given but the ready pipe. */
export function againOf(script: string, project: string, given: Given): string[] {
  const rest = FLAGS.filter((r) => r.again && given.has(r.flag)).flatMap((r) => (r.value ? [r.flag, String(given.get(r.flag))] : [r.flag]));
  return [script, WIRE.flag.serve, project, ...rest];
}
