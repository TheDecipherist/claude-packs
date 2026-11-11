// One order's rows, the same for `status` and the status line (split from run-status, 1.7.3): the project's, then one per
// agent, or the lead's current step when no agent runs.
import { basename } from 'node:path';
import { alignLive, checkedText, liveOf, stoppedOnPurpose } from './run-live.mjs';
import { percent } from './run-progress.mjs';
// a run in a worktree is its project's: VSYNTHGT, never the worktree's folder W12-LOOK (the user: "what is W12-LOOK?")
export const projectOf = (path) => path.replace(/\/\.claude\/worktrees\/[^/]+(?:\/.*)?$/, '');
/** One order's rows: { project: { name, percent, state }, agents: [{ who, id, title, percent, now, live, quiet }] }.
 *  `checkedAt`: when the runs were last checked (the status line's cache), said on the project's row. */
export function runRows(s, nowMs = Date.now(), checkedAt = null) {
    const base = basename(projectOf(s.project)).toUpperCase();
    const name = (s.host ? `${s.host.toUpperCase()}: ` : '') + base + (s.order && s.order.toUpperCase() !== base ? ` (${s.order})` : '');
    const n = s.agents.length;
    const checked = checkedText(checkedAt, nowMs);
    const left = s.finished ? 'done' : `${s.items - s.done} of ${s.items} items left`;
    const crew = s.finished ? '' : `, ${n} agent${n === 1 ? '' : 's'}`;
    const state = left + crew + checked;
    const agents = s.finished ? [] : s.agents.map((a) => {
        const step = s.steps.find((x) => x.id === a.step);
        // an agent seen by its worktree alone has said nothing yet: no step, said in words (never "?"); a worktree whose branch has
        // no commit of its own and nothing running is one waiting for its agent (the user: "all the mac agents say they are not
        // doing anything")
        const waiting = !a.step && a.fresh && !a.work?.procs;
        // still on purpose (its own file: "state" paused, waiting or finished, or `now` starting so) is never stuck: red means
        // something is wrong (KWB-164)
        const paused = stoppedOnPurpose(a.state, a.now);
        const live = liveOf(a.beat, a.updated, a.work ?? null, nowMs);
        return { who: a.name, id: a.step ?? '', title: a.step ? (a.title || step?.title || '') : waiting ? 'not started yet' : 'no status file yet',
            percent: a.percent ?? (step ? percent(step.done, step.items) : 0), now: a.now ?? '', live: '',
            ...live, ...(paused ? { quiet: 0, paused: true, action: '', work: null } : {}) }; // KWB-167: a stopped agent shows no last action or counts
    });
    const current = s.steps.find((x) => x.done < x.items);
    if (!s.finished && n === 0 && current) {
        agents.push({ who: 'lead', id: current.id, title: current.title, percent: percent(current.done, current.items), now: '', live: '', ...liveOf(s.lead, null, s.leadWork ?? null, nowMs) });
    }
    return { project: { name, percent: s.percent, state, left, checked }, agents: alignLive(agents) };
}
