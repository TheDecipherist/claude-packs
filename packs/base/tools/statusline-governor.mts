// The status line's governor field (typescript order W8.8 item 6): the slots the machine's governed jobs hold of the budget, the jobs
// waiting for slots and the jobs the watchdog holds paused, and a job paused past 10 minutes by name (item 5). It reads the governor's
// file without the lock and writes nothing, so a render never waits on a take. An idle machine draws nothing.
import { budgetOf, inFlight } from '../hooks/lib/governor.mts';
import type { GovernorHost, Job } from '../hooks/lib/governor.mts';
import type { Colours, Paint } from './statusline-paint.mts';

/** A job paused this long is named on the bar (and in the watchdog's log). */
export const LONG_PAUSE_MS = 10 * 60_000;
const COMMAND_CHARS = 40;
const MINUTE_MS = 60_000;

const named = (job: Job, nowMs: number): string => {
  const what = (job.command || job.kind).replace(/\s+/g, ' ').slice(0, COMMAND_CHARS);
  return `paused ${Math.floor((nowMs - (job.pausedAt ?? nowMs)) / MINUTE_MS)}m: ${what}`;
};

/** The bar's words for the governor, or '' when no job holds or waits for slots. */
export function governorSegment(host: GovernorHost, project: string | undefined, nowMs: number, paint: Paint, c: Colours): string {
  const { jobs, waiting } = inFlight(host);
  if (jobs.length === 0 && waiting.length === 0) return '';
  const used = jobs.reduce((sum, j) => sum + j.slots, 0);
  const paused = jobs.filter((j) => j.pausedAt !== null);
  const long = paused.filter((j) => nowMs - (j.pausedAt ?? nowMs) > LONG_PAUSE_MS);
  const parts = [`GOV ${used}/${budgetOf(host, project).slots}`];
  if (waiting.length) parts.push(`${waiting.length} queued`);
  if (paused.length) parts.push(`${paused.length} paused`);
  const text = paint(parts.join(' '), waiting.length || paused.length ? c.amber : c.teal);
  return [text, ...long.map((j) => paint(named(j, nowMs), c.red))].join(' ');
}
