// doctor's hook timing (KWB-24): every hook writes one line per call to .claude/hooks.log (packs/base/hooks/lib/hook-log.mts,
// lib/house.py's log_hook); per hook, the median and the worst of its last 100 calls. A hook whose MEDIAN is over 500 ms is a
// red check: the median is what every call pays, so a slow median is a slow hook. The worst is printed, never judged: one
// call on a loaded machine, or the once-only index built the first time, is a spike and not the hook's cost. A hook with fewer
// than MIN_CALLS calls logged is printed, not judged.
// The runner's own line (run-hooks: one process for a settings entry, node's start-up included) is judged the same way.
import { DAEMON_START, readHookLog } from '../packs/base/hooks/lib/hook-log.mts';
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

/** Per hook the median and worst of its last `last` calls, slowest median first. */
export function hookTimes(projectDir: string, last: number = LAST): HookTime[] {
  const by = new Map<string, number[]>();
  for (const r of readHookLog(projectDir).filter((x) => x.hook !== DAEMON_START)) {
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
  const times = hookTimes(projectDir);
  if (!times.length) {
    log('  hook timing: no calls logged yet (.claude/hooks.log fills as the hooks run)');
    return [];
  }
  log(`  hook timing (ms, each hook's last ${LAST} calls at most): ${times.map((t) => `${t.hook} ${t.median}/${t.worst}`).join(', ')} (median/worst)`);
  return times.filter((t) => t.calls >= MIN_CALLS && t.median > SLOW_MS).map((t) =>
    `${t.hook}: median ${t.median} ms over its last ${t.calls} calls (worst ${t.worst} ms), over ${SLOW_MS} ms: find what it does on every call ` +
    '(a scan of the repo, a child process, a whole transcript read) and make it incremental');
}
