// The status line's RUNS rows (1.8.0): where every unattended work order on this machine stands. One row a project (W8.9, the user:
// "the status line grows a row per agent"); the agents are `claude-packs top`'s:
//
//   SHOP                   ████████░░░░░░░░░░░░  47%  40 of 76 items left · W3b The import · 4 agents  ⚙ 12 proc · 3.4 cpu · 1.2G ram
//
// Finding the runs costs ps and git, too much for a bar drawn every second, so it runs detached (this file with --refresh)
// at most every TTL_MS and the bar draws from its cache: a slow refresh never holds a render, a missing cache draws nothing.
import { spawn } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain } from '../hooks/lib/hook-log.mts';
import { readJson, writeJson } from '../hooks/lib/json.mts';
import { workLine } from '../hooks/lib/run-live.mts';
import { projectLines, type ProjectLine } from '../hooks/lib/run-projects.mts';
import { percentLabel, runsReport } from '../hooks/lib/run-status.mts';
import type { OrderStatus } from '../hooks/lib/run-status.mts';
import { bold, COLOURS as C, meter } from './statusline-paint.mts';
import type { Paint, PaintMode } from './statusline-paint.mts';

const SELF = fileURLToPath(import.meta.url);
const TTL_MS = 30_000;          // the cache is refreshed when it is older than this
const LOCK_MS = 25_000;         // and no refresh was started in this long
const STALE_MS = 3 * 60_000;    // a cache this old is drawn dim, with its age

/** The cache file's content, as far as the bar reads it: it is outside data, so each field is narrowed where it is used. */
interface RunsCache { runs?: unknown; unreachable?: unknown; updated?: string }

const ageOf = (file: string, nowMs: number): number | null => { try { return nowMs - statSync(file).mtimeMs; } catch { return null; } };

function startRefresh(cache: string): void {
  spawn(process.execPath, [SELF, '--refresh', cache], { detached: true, stdio: 'ignore' }).unref();
}

/** Start a refresh when the cache is old and none is under way; true when one was started. Never throws. */
export function refreshRuns(cache: string, nowMs: number, start: (cache: string) => void = startRefresh): boolean {
  const age = ageOf(cache, nowMs);
  const lock = ageOf(`${cache}.lock`, nowMs);
  if ((age !== null && age < TTL_MS) || (lock !== null && lock < LOCK_MS)) return false;
  try {
    mkdirSync(dirname(cache), { recursive: true });
    writeFileSync(`${cache}.lock`, String(process.pid));
    start(cache);
    return true;
  } catch { return false; }
}

const isRun = (r: unknown): r is OrderStatus => {
  const run = r as Partial<OrderStatus> | null;
  return Boolean(run?.project) && Array.isArray(run?.agents) && Array.isArray(run?.steps);
};
const isUnreachable = (u: unknown): u is { host: string; why?: string } => typeof (u as { host?: unknown } | null)?.host === 'string';

/** The RUNS rows from the cache, [] when it is missing, unreadable or has no run. */
export function runsSegments(cache: string, nowMs: number, paint: Paint, mode: PaintMode): string[] {
  const report = readJson<RunsCache>(cache);
  const runs = Array.isArray(report?.runs) ? report.runs.filter(isRun) : [];
  const far = (Array.isArray(report?.unreachable) ? report.unreachable : []).filter(isUnreachable)
    .map((u) => `${bold(paint(`${u.host.toUpperCase()}:`, C.red), mode)} ${paint(`not reached (${u.why ?? '?'})`, C.red)}`);   // never silence
  if (runs.length === 0) return far;
  const age = ageOf(cache, nowMs);
  const stale = age !== null && age > STALE_MS;
  const tint = (colour: typeof C.white) => (stale ? C.dim : colour);
  // one row a project (run-projects.mts): its agents are the monitor's, never a row here (W8.9)
  const draw = (line: ProjectLine): string => {
    const step = line.step ? ` · ${line.step.slice(0, 30)}` : '';
    const crew = line.finished ? '' : ` · ${line.agents} agent${line.agents === 1 ? '' : 's'}`;
    const work = line.work.procs > 0 ? `  ${paint(workLine(line.work), C.green)}` : '';
    return `${bold(paint(line.name.padEnd(22), tint(C.white)), mode)} ${meter(line.percent, 20, paint)} ${paint(percentLabel(line.percent), tint(C.white))}  ${paint(`${line.left}${step}${crew}`, C.dim)}${work}`;
  };
  const rows = projectLines(runs).map(draw);
  if (stale && rows[0] !== undefined) rows[0] += paint(`  (as of ${Math.round((age ?? 0) / 60_000)}m ago)`, C.red);
  return [...rows, ...far];
}

if (isMain(import.meta.url) && process.argv[2] === '--refresh' && process.argv[3]) writeJson(process.argv[3], runsReport({ env: process.env, platform: process.platform }));
