// The live part of an agent's row (split from run-status, 1.7.3), in symbols one column wide each (the user: "cant we show it
// condensed as symbols or icons?"), every value under the same value of the row above ("equally placed under each other"),
// each column as wide as its widest value in that run and no wider ("still to much space"); the README has the legend:
//   ♥ 12s       its last heartbeat, that long ago (♡: the project has no heartbeat hook yet)
//   ⚙ 13 · 1.6c · 353M queued   what runs in its worktree: processes, cores, memory; queued: its build waits for a slot;
//                               ⚙ 0: nothing runs there (it is thinking or reading, which happens in Claude's own process)
//   ⟳ RUN <target>   its last action, READ | WRITE | RUN | AGENT; ⟳ while that call still runs
import type { Work } from './run-discovery.mts';

// The heartbeat hook sees every tool call, before and after; between the two ends of one long call (a build, a test run)
// the check of what runs in the agent's worktree says whether it still works. So an agent is quiet when:
const QUIET_MIN = 5;       // it made no call for this long (longer than any answer the model writes), or its call runs with
                           // nothing left working in its worktree for this long
const RUNNING_MIN = 30;    // where the processes cannot be read: one call running this long
const STILL_ON_PURPOSE = new Set(['paused', 'waiting', 'finished']);

/** An agent's last call: the heartbeat hook's file, or a transcript's last call (run-transcripts). */
export interface Beat { t?: string; event?: string; tool?: string; what?: string }
/** An agent's live column, in parts. */
export interface LiveParts { beat: string; work: Work | null; action: string; quiet: number }
/** A row with its parts set in columns: `live` is what alignLive fills. */
export interface Aligned extends LiveParts { live: string }

// 12s, 4m, 1h05m: every part with its unit
export const ago = (sec: number): string => (sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : `${Math.floor(sec / 3600)}h${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}m`);

// What kind of action each tool is, for "last action: READ" (the user: "can it show Last action : READ|WRITE"); a tool
// not listed shows its own name.
const ACTIONS: Readonly<Record<string, string>> = { Read: 'READ', Grep: 'READ', Glob: 'READ', LS: 'READ', WebFetch: 'READ', WebSearch: 'READ', NotebookRead: 'READ',
  Write: 'WRITE', Edit: 'WRITE', MultiEdit: 'WRITE', NotebookEdit: 'WRITE', Bash: 'RUN', Agent: 'AGENT', Task: 'AGENT' };
export const actionOf = (tool: unknown): string => (typeof tool === 'string' && Object.hasOwn(ACTIONS, tool) ? (ACTIONS[tool] ?? '') : String(tool || '?').toUpperCase());

export const SYMBOLS = { beat: '♥', noBeat: '♡', running: '⟳', work: '⚙' } as const;
const memText = (mb: number): string => (mb >= 1024 ? `${(mb / 1024).toFixed(1)}G` : `${Math.round(mb)}M`);
const WORK_PARTS = { procs: (w: Work): string => String(w.procs), cores: (w: Work): string => (w.cores ?? 0).toFixed(1), mem: (w: Work): string => memText(w.memMb ?? 0) };

/** What runs in one checkout, in a line: "⚙ 2 proc · 1.0 cpu · 300M ram" (an order's row, where the columns are its own). */
export const workLine = (w: Work): string => `${SYMBOLS.work} ${WORK_PARTS.procs(w)} proc · ${WORK_PARTS.cores(w)} cpu · ${WORK_PARTS.mem(w)} ram${w.queued ? ' queued' : ''}`;

/** Each agent's `live` from its parts: every column the width of its widest value among these rows, single spaces between,
 *  an empty column left out; processes, cores and memory always (zeros too), "queued" after them, so numbers line up. */
export function alignLive<R extends Aligned>(rows: R[]): R[] {
  const widest = (text: (r: R) => string): number => Math.max(0, ...rows.map(text).map((s) => s.length));
  const part = (key: keyof typeof WORK_PARTS) => (r: R): string => (r.work ? WORK_PARTS[key](r.work) : '');
  const width = { beat: widest((r) => r.beat), procs: widest(part('procs')), cores: widest(part('cores')), mem: widest(part('mem')) };
  const anyQueued = rows.some((r) => r.work?.queued);
  // every number with its unit (the user: "that number still has no meaning"): ⚙ 26 proc · 1.5 cpu · 1.1G ram
  const workWidth = width.procs ? 2 + width.procs + 8 + width.cores + 7 + width.mem + 4 + (anyQueued ? 7 : 0) : 0;
  for (const r of rows) {
    const work = r.work ? `${SYMBOLS.work} ${part('procs')(r).padStart(width.procs)} proc · ${part('cores')(r).padStart(width.cores)} cpu · ` +
      `${part('mem')(r).padStart(width.mem)} ram${r.work.queued ? ' queued' : ''}` : '';
    r.live = [width.beat ? r.beat.padEnd(width.beat) : null, workWidth ? work.padEnd(workWidth) : null, r.action ? r.action.slice(0, 50) : null]
      .filter((x): x is string => x !== null).join(' ');
  }
  return rows;
}

/** When an agent's own file says it was updated, or null: a date with no time is no clock (KWB-next: "2026-11-13" read as
 *  midnight UTC drew a finished agent red at 23h40m quiet). */
export const clockOf = (iso: string | null | undefined): number | null => {
  if (!/\d:\d\d/.test(iso ?? '')) return null;
  const t = Date.parse(iso ?? '');
  return Number.isNaN(t) ? null : t;
};

/** What an agent is doing now, from its last heartbeat, its own file and the check of its worktree, as the parts alignLive
 *  sets in columns: { beat: "♥ 12s", work, action: "⟳ RUN make", quiet }. quiet is the minutes it has been still when
 *  that means stuck, else 0. `work` is null where the processes could not be read. */
export function liveOf(beat: Beat | null, updated: string | null, work: Work | null, nowMs: number): LiveParts {
  const at = (iso: string | null | undefined): number | null => { const t = Date.parse(iso ?? ''); return Number.isNaN(t) ? null : t; };
  const beatAt = at(beat?.t);
  const last = Math.max(beatAt ?? -Infinity, clockOf(updated) ?? -Infinity);
  const still = last === -Infinity ? null : Math.max(0, Math.round((nowMs - last) / 1000));
  const running = beatAt !== null && beat?.event === 'pre' && last === beatAt;
  const quietFor = (min: number): boolean => still !== null && still / 60 >= min;
  // the heartbeat: every call, so 5 minutes still is stuck; a running call is stuck only with nothing working in its
  // worktree; with no heartbeat (an install from before the hook) the agent's own file moves once an item: the long rule,
  // unless the check sees work in its worktree
  const stuck = beatAt === null ? !work?.procs && quietFor(RUNNING_MIN) : !running ? quietFor(QUIET_MIN) : work ? work.procs === 0 && quietFor(QUIET_MIN) : quietFor(RUNNING_MIN);
  const quiet = stuck && still !== null ? Math.round(still / 60) : 0;
  const beatText = beatAt !== null ? `${SYMBOLS.beat} ${ago(Math.max(0, Math.round((nowMs - beatAt) / 1000)))}` : `${SYMBOLS.noBeat}${quiet && still !== null ? ` ${ago(still)}` : ''}`;
  const action = beatAt !== null ? `${running ? `${SYMBOLS.running} ` : ''}${actionOf(beat?.tool)}${beat?.what ? ` ${beat.what}` : ''}` : '';
  return { beat: beatText, work, action, quiet };
}

/** Whether an agent's own file or its `now` says it stopped on purpose (KWB-164: such an agent is never stuck). */
export const stoppedOnPurpose = (state: string | null | undefined, now: string | null | undefined): boolean =>
  STILL_ON_PURPOSE.has(state ?? '') || /^(?:paused|waiting|finished)\b/i.test(now ?? '');

/** ", checked 8s ago" from when the runs were checked (the status line's cache), or '' when that is not known. */
export const checkedText = (checkedAt: string | null, nowMs: number): string =>
  (checkedAt === null || Number.isNaN(Date.parse(checkedAt)) ? '' : `, checked ${ago(Math.max(0, Math.round((nowMs - Date.parse(checkedAt)) / 1000)))} ago`);
