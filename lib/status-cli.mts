// `claude-packs status`: where every unattended run stands, one line per project and one per agent, each with a bar (1.7.3;
// the user: "super simple with like a line graph ... PROJECT NAME (PROGRESS 0% - 100%) > AGENT X > STEP (PROGRESS 0% - 100%)").
//   status                                    every run alive on this machine
//   status --dir <project> [--order <name>]   one project's orders, running or not
//   status --watch <minutes>                  the same again every so many minutes
//   status --json [--out <file>]              the same as data (1.8.0): what the status line draws from, --out written whole
import { toJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import type { TreeRow } from '../packs/base/hooks/lib/run-tree.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';
import { barCells, percentLabel as pct, runsReport, runTree } from './run-status.mts';
import type { OrderStatus, RunsInput } from './run-status.mts';

export function bar(p: number, width: number): string {
  const [full, empty] = barCells(p, width);
  return `[${'█'.repeat(full)}${'░'.repeat(empty)}]`;
}

const HEAD = 24;   // a project or order name, its tree prefix included: every head row's bar in one column
const STEP = 28;   // an agent's step, its prefix included: every agent row's bar in one column

/** One row of the tree (run-tree.mjs) as plain text; ! marks a quiet agent or lead (the status line paints it red). */
function plainRow(row: TreeRow): string {
  if (row.kind === 'agent') {
    return `${row.prefix}${row.who.padEnd(10)} > ${[row.id, row.title].filter(Boolean).join(' ').slice(0, 25).padEnd(STEP - row.prefix.length)} ${bar(row.percent, 10)} ${pct(row.percent)}` +
      `  ${row.quiet ? '!' : ' '} ${row.live}${row.now ? `  ${row.now.slice(0, 50)}` : ''}`.trimEnd();
  }
  return `${row.prefix}${row.name.padEnd(HEAD - row.prefix.length)} ${bar(row.percent, 20)} ${pct(row.percent)}   ${row.state}${row.live ? `   ${row.quiet ? '! ' : ''}${row.live}` : ''}`;
}

/** One order's lines: its row, the lead on it when no agent runs, else one line per agent under it. */
export const statusLines = (s: OrderStatus, nowMs: number = Date.now()): string[] => runTree([s], nowMs).map(plainRow);

/** What a report is asked for: a project folder and an order, and (to plant them in a test) what `runsReport` takes. */
export type StatusReportOptions = Partial<RunsInput>;

export function statusReport(options: StatusReportOptions = {}): string[] {
  const { dir, runs, unreachable = [], notes = [] } = runsReport({ env: process.env, platform: process.platform, ...options });
  const far = unreachable.map((u) => `${u.host.toUpperCase()}: not reached (${u.why})`);   // a machine asleep is said, never silence
  if (runs.length === 0 && far.length === 0) return [dir ? `no work orders in ${dir}` : 'no run is alive on this machine', ...notes];
  return [...runTree(runs).map(plainRow), ...far, ...notes];
}

export interface StatusCommandOptions {
  log?: Logger;
  /** Waits this many milliseconds between two ticks of `--watch`. */
  wait?: (ms: number) => Promise<void>;
  /** How many ticks `--watch` runs; endless by default. */
  ticks?: number;
}

export async function statusCommand(args: readonly string[], { log = console.log, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), ticks = Infinity }: StatusCommandOptions = {}): Promise<number> {
  const at = (flag: string): string | null => (args.includes(flag) ? (args[args.indexOf(flag) + 1] ?? null) : null);
  const options: StatusReportOptions = { dir: at('--dir'), order: at('--order') };
  if (args.includes('--json')) {
    const report = runsReport({ env: process.env, platform: process.platform, ...options });
    const out = at('--out');
    if (!out) log(toJson(report, { pretty: true }));
    else if (!writeJson(out, report)) { log(`status: could not write ${out}`); return 1; }
    return 0;
  }
  const every = Number(at('--watch'));
  for (let tick = 0; tick < (every > 0 ? ticks : 1); tick += 1) {
    if (tick > 0) await wait(every * 60_000);
    if (every > 0) log(`-- ${new Date().toLocaleTimeString()}`);
    for (const line of statusReport(options)) log(line);
  }
  return 0;
}
