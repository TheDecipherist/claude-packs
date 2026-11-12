// The soak's verdicts (typescript order W10b items 1 and 2), computed from the samples and the notes of what was done, as lines of a table:
// each line says what was measured, the number, the line it is held to and whether it meets it. Pure: no process is read here.
import type { Row } from './soak-probe.mts';
import { slopePer10Min } from './soak-probe.mts';

export const SLOPE_LINE_MB_PER_10MIN = 1;
export const RSS_LINE_MB = 250;
export const WARMUP_S = 300;
/** How far a count after a restart may differ from the count at the start and still be "back to the start". */
const BACK_TO_START = 2;

export interface Verdict { what: string; value: string; line: string; ok: boolean }

/** The samples of the daemon that ran last without a restart (same pid at the end), after its warm-up of WARMUP_S seconds. */
export function lastSegment(rows: readonly Row[]): Row[] {
  const last = [...rows].reverse().find((r) => r.pid !== null)?.pid ?? null;
  const mine = rows.filter((r) => r.pid === last && r.heapMb !== null);
  const first = mine[0]?.t ?? 0;
  return mine.filter((r) => r.t - first >= WARMUP_S);
}

/** The heap slope of the last segment, MB per 10 minutes, and how many samples and seconds it spans. */
export function heapSlope(rows: readonly Row[]): { slope: number; samples: number; spanS: number } {
  const seg = lastSegment(rows);
  const xs = seg.map((r) => r.t);
  return { slope: slopePer10Min(xs, seg.map((r) => r.heapMb ?? 0)), samples: seg.length, spanS: seg.length === 0 ? 0 : (xs[xs.length - 1] ?? 0) - (xs[0] ?? 0) };
}

export interface Facts {
  expectedSamples: number;
  rows: readonly Row[];
  differences: number;
  compared: number;
  refusalsCompared: number;
  refusalsSeen: number;
  events: number;
  /** fds and children of the first sample of the run, and of the first sample after the kill -9. */
  startFds: number | null;
  startChildren: number | null;
  startWorkers: number | null;
  afterKill: { fds: number | null; children: number | null } | null;
  afterWorker: { workers: number | null } | null;
  oldGoneS: number | null;
  idleWindowS: number;
  left: readonly string[];
  endRssMb: number | null;
}

const near = (a: number | null, b: number | null): boolean => a !== null && b !== null && Math.abs(a - b) <= BACK_TO_START;

export function verdicts(f: Facts): Verdict[] {
  const slope = heapSlope(f.rows);
  const v = (what: string, value: string, line: string, ok: boolean): Verdict => ({ what, value, line, ok });
  const out: Verdict[] = [
    v('samples taken', `${f.rows.length}`, `${f.expectedSamples}`, f.rows.length >= f.expectedSamples),
    v('events played', `${f.events} (of them ${f.compared} compared)`, 'over 200,000 at the full length', f.events >= 200_000),
    v('verdict differences, daemon against the TypeScript runner', `${f.differences} of ${f.compared}`, '0', f.differences === 0),
    v('refusals among the compared (planted, a law refuses them)', `${f.refusalsSeen} seen of ${f.refusalsCompared} planted`, 'at least 1 seen', f.refusalsSeen > 0),
    v(`heap slope, last segment (${slope.samples} samples over ${Math.round(slope.spanS / 60)} min, forced collection)`, `${slope.slope.toFixed(2)} MB per 10 min`,
      `under ${SLOPE_LINE_MB_PER_10MIN} MB per 10 min`, slope.samples >= 2 && slope.slope < SLOPE_LINE_MB_PER_10MIN),
  ];
  if (f.afterKill !== null) {
    out.push(v('file descriptors after kill -9 (the new daemon)', `${f.afterKill.fds} against ${f.startFds} at the start`, `back to the start (within ${BACK_TO_START})`, near(f.afterKill.fds, f.startFds)));
    out.push(v('child processes after kill -9 (without the sampler)', `${f.afterKill.children} against ${f.startChildren} at the start`, `back to the start (within ${BACK_TO_START})`, near(f.afterKill.children, f.startChildren)));
  }
  if (f.afterWorker !== null) out.push(v('workers after one was ended', `${f.afterWorker.workers} against ${f.startWorkers}`, 'back to the start', f.afterWorker.workers === f.startWorkers));
  out.push(v('old daemon gone after the kit update', f.oldGoneS === null ? 'still running' : `${f.oldGoneS} s`, `within its idle window (${f.idleWindowS / 60} min)`, f.oldGoneS !== null && f.oldGoneS <= f.idleWindowS));
  out.push(v('left behind after the daemon was stopped', f.left.length === 0 ? 'nothing' : f.left.join('; '), 'no process, worker, socket file, pid file or lock file', f.left.length === 0));
  out.push(v('daemon RSS at the end (fresh install)', f.endRssMb === null ? 'unread' : `${f.endRssMb} MB`, `under ${RSS_LINE_MB} MB (d-31)`, f.endRssMb !== null && f.endRssMb < RSS_LINE_MB));
  return out;
}

export const asTable = (rows: readonly Verdict[]): string => ['| measure | value | line | meets |', '|---|---|---|---|', ...rows.map((r) => `| ${r.what} | ${r.value} | ${r.line} | ${r.ok ? 'yes' : 'NO'} |`)].join('\n');
