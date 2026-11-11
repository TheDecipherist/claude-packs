// The status line's RUNS rows (1.8.0): where every unattended work order on this machine stands, the user's form:
// "PROJECT NAME (PROGRESS 0% - 100%) > AGENT X > STEP (PROGRESS 0% - 100%)".
//
//   SHOP                   ████████░░░░░░░░░░░░  47%  40 of 76 items left, 4 agents
//     > api        > W3b The import            ██░░░░░░░░  23%  ♥ 12s ⚙ 3 proc · 1.2 cpu · 300M ram READ src/import.ts
//
// Finding the runs costs ps and git, too much for a bar drawn every second, so it runs detached (this file with --refresh)
// at most every TTL_MS and the bar draws from its cache: a slow refresh never holds a render, a missing cache draws nothing.
import { spawn } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson } from '../hooks/lib/json.mjs';
import { percentLabel, runRows, runsReport } from '../hooks/lib/run-status.mjs';
import { bold, COLOURS as C, meter } from './statusline-paint.mjs';

const SELF = fileURLToPath(import.meta.url);
const TTL_MS = 30_000;          // the cache is refreshed when it is older than this
const LOCK_MS = 25_000;         // and no refresh was started in this long
const STALE_MS = 3 * 60_000;    // a cache this old is drawn dim, with its age

const ageOf = (file, nowMs) => { try { return nowMs - statSync(file).mtimeMs; } catch { return null; } };

function startRefresh(cache) {
  spawn(process.execPath, [SELF, '--refresh', cache], { detached: true, stdio: 'ignore' }).unref();
}

/** Start a refresh when the cache is old and none is under way; true when one was started. Never throws. */
export function refreshRuns(cache, nowMs, start = startRefresh) {
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

/** The RUNS rows from the cache, [] when it is missing, unreadable or has no run. */
export function runsSegments(cache, nowMs, paint, mode) {
  const report = readJson(cache);
  const runs = Array.isArray(report?.runs) ? report.runs.filter((r) => r?.project && Array.isArray(r.agents) && Array.isArray(r.steps)) : [];
  const far = (Array.isArray(report?.unreachable) ? report.unreachable : []).filter((u) => typeof u?.host === 'string')
    .map((u) => `${bold(paint(`${u.host.toUpperCase()}:`, C.red), mode)} ${paint(`not reached (${u.why ?? '?'})`, C.red)}`);   // never silence
  if (runs.length === 0) return far;
  const age = ageOf(cache, nowMs);
  const stale = age !== null && age > STALE_MS;
  const tint = (colour) => (stale ? C.dim : colour);
  const rows = runs.flatMap((r) => {
    const { project, agents } = runRows(r, nowMs, report.updated);
    const head = `${bold(paint(project.name.padEnd(22), tint(C.white)), mode)} ${meter(project.percent, 20, paint)} ${paint(percentLabel(project.percent), tint(C.white))}  ${paint(project.state, C.dim)}`;
    return [head, ...agents.map((a) => `  ${paint('>', C.dim)} ${paint(a.who.padEnd(10), a.quiet ? C.red : tint(C.lavender))} ${paint('>', C.dim)} ` +
      `${paint(`${a.id ?? '?'} ${a.title.slice(0, 22)}`.padEnd(27), tint(C.teal))} ${meter(a.percent, 10, paint)} ${paint(percentLabel(a.percent), tint(C.white))}` +
      `  ${paint(a.live, a.quiet ? C.red : C.green)}${a.now ? paint(`  ${a.now.slice(0, 60)}`, C.dim) : ''}`.trimEnd())];
  });
  if (stale) rows[0] += paint(`  (as of ${Math.round(age / 60_000)}m ago)`, C.red);
  return [...rows, ...far];
}

if (process.argv[1] === SELF && process.argv[2] === '--refresh' && process.argv[3]) writeJson(process.argv[3], runsReport());
