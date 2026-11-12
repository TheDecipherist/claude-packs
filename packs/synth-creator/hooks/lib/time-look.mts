// time-guard's looks at the machine, taken in a process of their own (W8.3; runtime-cost survey, section 4: the call that found its
// minute stale ran `ps` and a `git status` and `git log` per agent worktree and waited on them: 4 ms median, 504 ms p95 at a Write,
// 2.1 s worst). The hook starts `time-guard --look <json>` detached and answers at once; the look lands in look.json beside the
// hook's state, and the next event reads it and says what it found (the same finding, one event later).
//   lookLater(place, self, ask)   starts the look
//   takeLook(place, ask, now)     the look itself: the machine's findings, and each asked worktree's unsaved age and last commit
//   readLook(place)               the last look, or null
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, writeJson } from './json.mts';
import { ownProcesses, processTable } from './own-processes.mts';
import { machineFindings } from './time-findings.mts';
import type { Finding, Row, TimeCfg } from './time-findings.mts';
import { lastCommitMin, unsavedMin } from './time-state.mts';
import type { Place } from './time-state.mts';

/** What a look is asked: the guard's values, the session whose processes count as its own, and the worktrees to read. */
export interface LookAsk { cfg: TimeCfg; sessionPid: number; worktrees: string[] }

/** What a look found; `at` is when, in seconds since the epoch. `unsaved` and `commit` are the times (seconds since the epoch) of a
 *  worktree's oldest uncommitted change and last commit, null when it has none: a look of one agent keeps what another's found. */
export interface Look { at: number; findings: Finding[]; unsaved: Record<string, number | null>; commit: Record<string, number | null> }

const lookFile = (place: Place): string => join(place.stateDir, 'look.json');

export const readLook = (place: Place): Look | null => readJson<Look>(lookFile(place));

/** A look's time of a worktree as minutes ago, at `now`; null when it has none. */
export const minutesSince = (time: number | null | undefined, now: number): number | null => (time === null || time === undefined ? null : (now - time) / 60);

const asTime = (minutes: number | null, now: number): number | null => (minutes === null ? null : now - minutes * 60);

export function takeLook(place: Place, ask: LookAsk, now: number): number {
  const table = processTable();
  const findings = machineFindings(table.map((r): Row => [r.pid, r.age, r.cmd]), ownProcesses(table, ask.sessionPid), ask.cfg);
  const before = readLook(place);
  const unsaved: Look['unsaved'] = { ...before?.unsaved };
  const commit: Look['commit'] = { ...before?.commit };
  for (const wt of ask.worktrees) {
    unsaved[wt] = asTime(unsavedMin(wt, now, place.env), now);
    commit[wt] = asTime(lastCommitMin(wt, now, place.env), now);
  }
  try { mkdirSync(place.stateDir, { recursive: true }); writeJson(lookFile(place), { at: now, findings, unsaved, commit } satisfies Look); } catch { /* next time */ }
  return 0;
}

/** Starts the look detached, so the event never waits on it; `self` is the hook's own file, run with `--look`. */
export function lookLater(place: Place, self: string, ask: LookAsk): void {
  try { spawn(process.execPath, [self, '--look', JSON.stringify(ask)], { cwd: place.projectRoot, detached: true, stdio: 'ignore', env: { ...place.env } }).unref(); } catch { /* next time */ }
}
