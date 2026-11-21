// resident/options: the daemon's command line, read once through one table and written again from the same table (W10b finding 7). A
// re-exec (24 hours old, 400 MB) starts the daemon with every flag it was given, so a tuned daemon stays tuned and a flag added here is
// parsed and carried by this row alone. `--ready-fd` is the one row a re-exec leaves out: the pipe it names is the first start's.
import { WIRE } from '../lib/proxy-wire-table.mts';

/** The workers the pool starts with, each importing every hook at start. An event of a Bash write runs 37 judges at once, one of them
 *  once-only (80 to 100 ms): with 4 warm workers of which 1 preloaded and a hook held by at most 4, the jobs queued on the few holders
 *  while workers sat idle, and the event's worst queue read 15 to 27 ms over 12 rounds at load 3.8 (8 such workers read alike); with 6
 *  workers that all preload it read 4.0 to 4.2, with 5 4.3, with 8 3.1 (scratch pool-harness, real index). About 17 MB a worker (W8.4). */
export const WARM = 6;

/** At most this many workers import any one hook while the pool is not full (W8.4): every warm worker, and a grown one only after a job's
 *  spread wait. Doctor lets each hook this many cold calls after a start (one per worker). */
export const SPREAD = WARM;

/** The pool's shape for `warm` workers: each preloads every hook and every one may hold any hook, so no job of an event waits on a
 *  hook's few holders while another warm worker is idle (KWB-next, the pool verdict at stage 3 of supernova2_monitor). */
export const poolShape = (warm: number): { warm: number; preload: number; spread: number } => ({ warm, preload: warm, spread: Math.max(SPREAD, warm) });

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
  { flag: '--warm', value: true, again: true },
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
