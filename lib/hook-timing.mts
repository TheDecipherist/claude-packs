// doctor's hook timing (KWB-24): every hook writes one line per call to .claude/hooks.log (packs/base/hooks/lib/hook-log.mts,
// lib/house.py's log_hook); per hook, the median and the worst of its last 100 calls. A hook whose MEDIAN is over 500 ms is a
// red check: the median is what every call pays, so a slow median is a slow hook. The worst is printed, never judged: one
// call on a loaded machine, or the once-only index built the first time, is a spike and not the hook's cost. A hook with fewer
// than MIN_CALLS calls logged is printed, not judged.
// The runner's own line (run-hooks: one process for a settings entry, node's start-up included) is judged the same way.
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { BUILD_END, BUILD_START, BUSY_END, BUSY_START, DAEMON_START, readHookLog, type HookLogEntry } from '../packs/base/hooks/lib/hook-log.mts';
import { readJson } from '../packs/base/hooks/lib/json.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';

export const SLOW_MS = 500;
export const LAST = 100;
export const MIN_CALLS = 3; // one or two calls are not a median: printed, not judged

export interface HookTime { hook: string; calls: number; median: number; worst: number }

/** The middle of the values (the mean of the two middle ones, rounded, when there is an even number); 0 for none. */
export function median(values: readonly number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : Math.round(((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2);
}

/** When the project's current install was written, in ms since the epoch: the lock's `updated`, else its file's mtime, else 0 (no lock). */
export function installedAt(projectDir: string): number {
  const file = join(projectDir, '.claude', 'claude-packs.lock.json');
  const updated = Date.parse(readJson<{ updated?: string }>(file)?.updated ?? '');
  if (!Number.isNaN(updated)) return updated;
  try { return statSync(file).mtimeMs; } catch { return 0; }   // no lock: every call is the project's
}

/** Per hook the median and worst of its last `last` calls made since `since` (ms since the epoch; 0: every call), slowest median first. */
export function hookTimes(projectDir: string, last: number = LAST, since = 0): HookTime[] {
  const by = new Map<string, number[]>();
  // the daemon's start and buildq's build window lines mark times, they are no hook (a build-end once read "13/1022" here)
  const MARKS = new Set([DAEMON_START, BUILD_START, BUILD_END, BUSY_START, BUSY_END]);
  // a call inside a build's or a busy machine's window says nothing of the hook's own cost: left out, as the event budgets do
  // (KWB-254: making-check ran 611 and 578 ms while a build held the cores, and this check alone turned doctor red)
  const calls = outsideBuilds(readHookLog(projectDir)).kept.filter((x) => !MARKS.has(x.hook));
  for (const r of calls.filter((x) => since === 0 || Date.parse(x.time) >= since)) {
    const list = by.get(r.hook) ?? [];
    list.push(r.ms);
    by.set(r.hook, list);
  }
  return [...by].map(([hook, all]) => {
    const ms = all.slice(-last);
    return { hook, calls: ms.length, median: median(ms), worst: Math.max(...ms) };
  }).sort((a, b) => b.median - a.median || a.hook.localeCompare(b.hook));
}

/** Prints the timing line and returns one problem per hook whose median is over SLOW_MS. */
export function timingProblems(projectDir: string, log: Logger = console.log): string[] {
  // the calls since the current install only, as the event budgets read them (KWB-196): a hook made fast was red for its old calls
  // until a hundred new ones pushed them out, and every task waited on it (supernova2_monitor, KWB-next)
  const times = hookTimes(projectDir, LAST, installedAt(projectDir));
  if (!times.length) {
    log('  hook timing: no calls logged since the current install (.claude/hooks.log fills as the hooks run)');
    return [];
  }
  log(`  hook timing (ms, each hook's last ${LAST} calls at most): ${times.map((t) => `${t.hook} ${t.median}/${t.worst}`).join(', ')} (median/worst)`);
  return times.filter((t) => t.calls >= MIN_CALLS && t.median > SLOW_MS).map((t) =>
    `${t.hook}: median ${t.median} ms over its last ${t.calls} calls (worst ${t.worst} ms), over ${SLOW_MS} ms: find what it does on every call ` +
    '(a scan of the repo, a child process, a whole transcript read) and make it incremental');
}

/** A build that never logged its end (killed) holds its window this long at most. */
export const BUILD_WINDOW_MS = 60 * 60_000;
/** The key of the machine's busy window (resident/event busyMark writes its lines with this tool). */
const MACHINE = 'machine';
/** The load average the busy mark reads is the 1-minute one (resident/event busyNext): its window, in ms. */
export const LOAD_WINDOW_MS = 60_000;

/** The entries made while no build of buildq ran (its build-start and build-end lines, keyed by the build's pid), and how many
 *  were left out: a build that holds the cores slows every hook beside it, which says nothing of the hook's own work. */
export function outsideBuilds(entries: readonly HookLogEntry[]): { kept: HookLogEntry[]; during: number } {
  const open = new Map<string, number>();
  const kept: HookLogEntry[] = [];
  let during = 0;
  for (const e of entries) {
    const at = Date.parse(e.time);
    // a build's window, keyed by its pid, and a busy machine's (KWB-next: another project held the cores), keyed `machine`
    // the machine's mark reads the 1-minute load average, which trails the load by up to its window: the calls in that minute
    // before the mark ran on the loaded machine too (KWB-258: look-gate 444 ms, 35 s before a busy-start, judged as quiet)
    if (e.hook === BUSY_START && e.tool === MACHINE) {
      while (kept.length > 0 && at - Date.parse(kept[kept.length - 1]?.time ?? '') <= LOAD_WINDOW_MS) { kept.pop(); during += 1; }
    }
    if (e.hook === BUILD_START || e.hook === BUSY_START) { open.set(e.tool, at); continue; }
    if (e.hook === BUILD_END || e.hook === BUSY_END) {
      // an end whose start the log rotated away (KWB-246): the calls before it, within a window's length, were inside it
      if (!open.has(e.tool)) {
        while (kept.length > 0 && at - Date.parse(kept[kept.length - 1]?.time ?? '') <= BUILD_WINDOW_MS) { kept.pop(); during += 1; }
      }
      open.delete(e.tool);
      continue;
    }
    // a new daemon has no busy state: it marks the window again if the machine is still past its budget (resident/event busyMark)
    if (e.hook === DAEMON_START) open.delete(MACHINE);
    // a killed build's window ends after an hour; the machine's holds until its end (KWB-251: a busy evening outlasts an hour)
    for (const [pid, from] of open) if (pid !== MACHINE && at - from > BUILD_WINDOW_MS) open.delete(pid);
    if (open.size > 0) { during += 1; continue; }
    kept.push(e);
  }
  return { kept, during };
}
