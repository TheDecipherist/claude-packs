// doctor's per-event budgets (typescript order W8.4, d-9, review-2-go 6.3): what a project pays per tool call, held per event and per
// hook, never pooled. A hook is judged on its own `ms` (its own line in .claude/hooks.log) at each event class; the event on its
// wall, the `proxy` line's when the client wrote one (the whole call as the user waits for it) and the runner's or daemon's `event`
// line when not. A daemon whose pool is full (the `queue` of its event lines over 20 ms at p95) is named as the cause, and no hook of
// that event is blamed for time it spent waiting. Fewer than MIN_CALLS calls are printed, not judged (one call is not a p95).
import { join } from 'node:path';
import { readHookLog, type HookLogEntry } from '../packs/base/hooks/lib/hook-log.mts';
import { readHookTable } from '../packs/base/hooks/lib/hook-table.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';
import { median } from './hook-timing.mts';

export const EVENT_CLASSES = ['Pre Bash', 'Pre Write', 'Post', 'Prompt', 'SessionStart', 'Stop'] as const;
export type EventClass = (typeof EVENT_CLASSES)[number];
export interface Budget { p50: number; p95: number }

/** The event's wall, p50 and p95 in ms (the order's table). */
export const EVENT_BUDGET: Readonly<Record<EventClass, Budget>> = {
  'Pre Bash': { p50: 100, p95: 250 }, 'Pre Write': { p50: 120, p95: 300 }, Post: { p50: 60, p95: 150 },
  Prompt: { p50: 80, p95: 150 }, SessionStart: { p50: 150, p95: 300 }, Stop: { p50: 200, p95: 1000 },
};
/** One hook at one event: p50 and p95 in ms, and its worst call. Stop's worst is the git look's 1 s cap plus the margin a loaded machine needs
 *  (git-guard keeps that look, W8.3); every other event holds the order's 200. */
export const HOOK_BUDGET: Budget = { p50: 10, p95: 50 };
export const WORST_MS = 200;
export const STOP_WORST_MS = 1500;
/** A daemon whose events wait for a worker longer than this at p95 has a full pool. */
export const POOL_QUEUE_MS = 20;
export const LAST = 100;
export const MIN_CALLS = 5;

const WRITES = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const NOT_HOOKS = new Set(['event', 'proxy', 'run-hooks']);

/** The event class a log line belongs to (null for one no budget names: a Read, an Agent call, a SessionEnd). */
export function classOf(event: string, tool: string): EventClass | null {
  if (event === 'PreToolUse') return tool === 'Bash' ? 'Pre Bash' : WRITES.has(tool) ? 'Pre Write' : null;
  if (event === 'PostToolUse') return 'Post';
  if (event === 'UserPromptSubmit') return 'Prompt';
  if (event === 'SessionStart') return 'SessionStart';
  return event === 'Stop' ? 'Stop' : null;
}

/** The p-th percentile (nearest rank) of the values; 0 for none. */
export function percentile(values: readonly number[], p: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s.length === 0 ? 0 : (s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)] ?? 0);
}

export interface Spread { calls: number; p50: number; p95: number; worst: number }
const spread = (ms: readonly number[]): Spread => ({ calls: ms.length, p50: median(ms), p95: percentile(ms, 95), worst: Math.max(0, ...ms) });

/** What one event class's lines say: the event's wall, its queue, each hook's spread. */
export interface ClassTimes { wall: Spread; wallFrom: 'proxy' | 'event'; queue: Spread | null; hooks: Map<string, Spread> }

function lastOf<T>(list: readonly T[]): T[] { return list.slice(-LAST); }

/** Per event class, from the log's last LAST calls of each series. */
export function classTimes(entries: readonly HookLogEntry[]): Map<EventClass, ClassTimes> {
  const byClass = new Map<EventClass, HookLogEntry[]>();
  for (const e of entries) {
    const c = classOf(e.event, e.tool);
    if (c !== null) byClass.set(c, [...(byClass.get(c) ?? []), e]);
  }
  const out = new Map<EventClass, ClassTimes>();
  for (const [c, lines] of byClass) {
    const proxy = lines.filter((l) => l.hook === 'proxy');
    const events = lines.filter((l) => l.hook === 'event');
    const walls = proxy.length > 0 ? proxy : events;
    const queued = events.filter((l) => l.source === 'daemon' && l.queue !== undefined);
    const hooks = new Map<string, number[]>();
    for (const l of lines.filter((x) => !NOT_HOOKS.has(x.hook))) hooks.set(l.hook, [...(hooks.get(l.hook) ?? []), l.ms]);
    out.set(c, {
      wall: spread(lastOf(walls).map((l) => l.ms)), wallFrom: proxy.length > 0 ? 'proxy' : 'event',
      queue: queued.length > 0 ? spread(lastOf(queued).map((l) => l.queue ?? 0)) : null,
      hooks: new Map([...hooks].map(([h, ms]) => [h, spread(lastOf(ms))])),
    });
  }
  return out;
}

const fmt = (s: Spread): string => `${s.p50}/${s.p95}`;

/** The problems of one event class: a full pool (and nothing else of it), else a slow event, else each hook over its budget. */
function classProblems(c: EventClass, t: ClassTimes): string[] {
  if (t.queue !== null && t.queue.calls >= MIN_CALLS && t.queue.p95 > POOL_QUEUE_MS) {
    return [`the resident runner's pool is full at ${c}: its events waited for a worker ${t.queue.p95} ms at p95 over their last ${t.queue.calls} (over ${POOL_QUEUE_MS} ms). ` +
      'The pool is the cause, not a hook: more cores free, fewer agents at once, or a hook that holds a worker too long (the `late` lines in the daemon log)'];
  }
  const problems: string[] = [];
  const b = EVENT_BUDGET[c];
  if (t.wall.calls >= MIN_CALLS && (t.wall.p50 > b.p50 || t.wall.p95 > b.p95)) {
    problems.push(`${c}: the event took ${fmt(t.wall)} ms (p50/p95 of ${t.wall.calls} calls, the ${t.wallFrom} line's wall), over its budget of ${b.p50}/${b.p95} ms`);
  }
  const worst = c === 'Stop' ? STOP_WORST_MS : WORST_MS;
  for (const [hook, s] of [...t.hooks].sort(([a], [z]) => a.localeCompare(z))) {
    if (s.calls < MIN_CALLS) continue;
    if (s.p50 > HOOK_BUDGET.p50 || s.p95 > HOOK_BUDGET.p95 || s.worst > worst) {
      problems.push(`${hook} at ${c}: ${fmt(s)} ms (p50/p95, worst ${s.worst}) over its last ${s.calls} calls, over its budget of ${HOOK_BUDGET.p50}/${HOOK_BUDGET.p95} ms and worst ${worst}: ` +
        'find what it does on every call (a scan, a child process, a whole file read) and keep it or make it incremental');
    }
  }
  return problems;
}

/** Prints each event class's wall and returns the problems: hooks over their budget per event, events over theirs, a full pool. */
export function budgetProblems(projectDir: string, log: Logger = console.log): string[] {
  // The runner's and the daemon's per-hook lines are the hook's own work. A hook that runs as its own process (the table does not name it:
  // a project's own, a python one) logs the process's age, node's start included, which this budget would read as the hook's: those keep
  // the median check of hook-timing.mts. A project with no table has every hook judged.
  const table = readHookTable(join(projectDir, '.claude', 'hooks'));
  const named = table === null ? null : new Set(table.filter((r) => !r.async && !r.asyncRewake).map((r) => r.hook));
  const times = classTimes(readHookLog(projectDir).filter((e) => named === null || NOT_HOOKS.has(e.hook) || named.has(e.hook)));
  if (times.size === 0) return [];
  log(`  event budgets (wall p50/p95 ms, last ${LAST} calls): ${EVENT_CLASSES.filter((c) => times.has(c)).map((c) => {
    const t = times.get(c);
    return t === undefined ? '' : `${c} ${fmt(t.wall)} of ${EVENT_BUDGET[c].p50}/${EVENT_BUDGET[c].p95}`;
  }).join(', ')}`);
  return EVENT_CLASSES.flatMap((c) => { const t = times.get(c); return t === undefined ? [] : classProblems(c, t); });
}
