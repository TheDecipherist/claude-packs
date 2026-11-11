// The heartbeat hook sees every tool call, before and after; between the two ends of one long call (a build, a test run)
// the check of what runs in the agent's worktree says whether it still works. So an agent is quiet when:
const QUIET_MIN = 5; // it made no call for this long (longer than any answer the model writes), or its call runs with
// nothing left working in its worktree for this long
const RUNNING_MIN = 30; // where the processes cannot be read: one call running this long
const STILL_ON_PURPOSE = new Set(['paused', 'waiting', 'finished']);
// 12s, 4m, 1h05m: every part with its unit
export const ago = (sec) => (sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : `${Math.floor(sec / 3600)}h${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}m`);
// What kind of action each tool is, for "last action: READ" (the user: "can it show Last action : READ|WRITE"); a tool
// not listed shows its own name.
const ACTIONS = { Read: 'READ', Grep: 'READ', Glob: 'READ', LS: 'READ', WebFetch: 'READ', WebSearch: 'READ', NotebookRead: 'READ',
    Write: 'WRITE', Edit: 'WRITE', MultiEdit: 'WRITE', NotebookEdit: 'WRITE', Bash: 'RUN', Agent: 'AGENT', Task: 'AGENT' };
export const actionOf = (tool) => (typeof tool === 'string' && Object.hasOwn(ACTIONS, tool) ? (ACTIONS[tool] ?? '') : String(tool || '?').toUpperCase());
export const SYMBOLS = { beat: '♥', noBeat: '♡', running: '⟳', work: '⚙' };
const memText = (mb) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)}G` : `${Math.round(mb)}M`);
const WORK_PARTS = { procs: (w) => String(w.procs), cores: (w) => (w.cores ?? 0).toFixed(1), mem: (w) => memText(w.memMb ?? 0) };
/** What runs in one checkout, in a line: "⚙ 2 proc · 1.0 cpu · 300M ram" (an order's row, where the columns are its own). */
export const workLine = (w) => `${SYMBOLS.work} ${WORK_PARTS.procs(w)} proc · ${WORK_PARTS.cores(w)} cpu · ${WORK_PARTS.mem(w)} ram${w.queued ? ' queued' : ''}`;
/** Each agent's `live` from its parts: every column the width of its widest value among these rows, single spaces between,
 *  an empty column left out; processes, cores and memory always (zeros too), "queued" after them, so numbers line up. */
export function alignLive(rows) {
    const widest = (text) => Math.max(0, ...rows.map(text).map((s) => s.length));
    const part = (key) => (r) => (r.work ? WORK_PARTS[key](r.work) : '');
    const width = { beat: widest((r) => r.beat), procs: widest(part('procs')), cores: widest(part('cores')), mem: widest(part('mem')) };
    const anyQueued = rows.some((r) => r.work?.queued);
    // every number with its unit (the user: "that number still has no meaning"): ⚙ 26 proc · 1.5 cpu · 1.1G ram
    const workWidth = width.procs ? 2 + width.procs + 8 + width.cores + 7 + width.mem + 4 + (anyQueued ? 7 : 0) : 0;
    for (const r of rows) {
        const work = r.work ? `${SYMBOLS.work} ${part('procs')(r).padStart(width.procs)} proc · ${part('cores')(r).padStart(width.cores)} cpu · ` +
            `${part('mem')(r).padStart(width.mem)} ram${r.work.queued ? ' queued' : ''}` : '';
        r.live = [width.beat ? r.beat.padEnd(width.beat) : null, workWidth ? work.padEnd(workWidth) : null, r.action ? r.action.slice(0, 50) : null]
            .filter((x) => x !== null).join(' ');
    }
    return rows;
}
/** What an agent is doing now, from its last heartbeat, its own file and the check of its worktree, as the parts alignLive
 *  sets in columns: { beat: "♥ 12s", work, action: "⟳ RUN make", quiet }. quiet is the minutes it has been still when
 *  that means stuck, else 0. `work` is null where the processes could not be read. */
export function liveOf(beat, updated, work, nowMs) {
    const at = (iso) => { const t = Date.parse(iso ?? ''); return Number.isNaN(t) ? null : t; };
    const beatAt = at(beat?.t);
    const last = Math.max(beatAt ?? -Infinity, at(updated) ?? -Infinity);
    const still = last === -Infinity ? null : Math.max(0, Math.round((nowMs - last) / 1000));
    const running = beatAt !== null && beat?.event === 'pre' && last === beatAt;
    const quietFor = (min) => still !== null && still / 60 >= min;
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
export const stoppedOnPurpose = (state, now) => STILL_ON_PURPOSE.has(state ?? '') || /^(?:paused|waiting|finished)\b/i.test(now ?? '');
/** ", checked 8s ago" from when the runs were checked (the status line's cache), or '' when that is not known. */
export const checkedText = (checkedAt, nowMs) => (checkedAt === null || Number.isNaN(Date.parse(checkedAt)) ? '' : `, checked ${ago(Math.max(0, Math.round((nowMs - Date.parse(checkedAt)) / 1000)))} ago`);
