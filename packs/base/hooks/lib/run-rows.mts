// One order's rows, the same for `status` and the status line (split from run-status, 1.7.3): the project's, then one per
// agent, or the lead's current step when no agent runs.
import { basename } from 'node:path';
import type { Work } from './run-discovery.mts';
import { alignLive, checkedText, liveOf, stoppedOnPurpose, type Aligned, type Beat } from './run-live.mts';
import { percent, type Step } from './run-progress.mts';

/** One agent of an order, from its worktree, its own file and its heartbeat. `work` is what runsReport measured there. */
export interface AgentStatus {
  name: string;
  step: string | null;
  title: string;
  now: string;
  state: string | null;
  updated: string | null;
  percent: number | null;
  beat: Beat | null;
  path: string;
  stale: boolean;
  fresh: boolean;
  work?: Work | null;
}

/** One order's progress. `host` is the machine it runs on, once other machines are listed; `leadWork` what runs in its checkout. */
export interface OrderStatus {
  project: string;
  order: string;
  steps: Step[];
  agents: AgentStatus[];
  items: number;
  done: number;
  percent: number;
  source: string;
  finished: boolean;
  lead: Beat | null;
  host?: string;
  leadWork?: Work | null;
}

/** One agent's row: who, what step, how far, and its live column. */
export interface AgentRow extends Aligned { who: string; id: string; title: string; percent: number; now: string; paused?: boolean }
/** One order's project row. */
export interface ProjectRow { name: string; percent: number; state: string; left: string; checked: string }

// a run in a worktree is its project's: VSYNTHGT, never the worktree's folder W12-LOOK (the user: "what is W12-LOOK?")
export const projectOf = (path: string): string => path.replace(/\/\.claude\/worktrees\/[^/]+(?:\/.*)?$/, '');

/** One order's rows: { project: { name, percent, state }, agents: [{ who, id, title, percent, now, live, quiet }] }.
 *  `checkedAt`: when the runs were last checked (the status line's cache), said on the project's row. */
export function runRows(s: OrderStatus, nowMs: number = Date.now(), checkedAt: string | null = null): { project: ProjectRow; agents: AgentRow[] } {
  const base = basename(projectOf(s.project)).toUpperCase();
  const name = (s.host ? `${s.host.toUpperCase()}: ` : '') + base + (s.order && s.order.toUpperCase() !== base ? ` (${s.order})` : '');
  const n = s.agents.length;
  const checked = checkedText(checkedAt, nowMs);
  const left = s.finished ? 'done' : `${s.items - s.done} of ${s.items} items left`;
  const crew = s.finished ? '' : `, ${n} agent${n === 1 ? '' : 's'}`;
  const state = left + crew + checked;
  const agents: AgentRow[] = s.finished ? [] : s.agents.map((a): AgentRow => {
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
      ...live, ...(paused ? { quiet: 0, paused: true, action: '', work: null } : {}),   // KWB-167: a stopped agent shows no last action or counts
      ...(a.percent !== null && a.percent >= 100 ? { quiet: 0 } : {}) };   // every item done: still is finished, never stuck (KWB-next)
  });
  const current = s.steps.find((x) => x.done < x.items);
  if (!s.finished && n === 0 && current) {
    agents.push({ who: 'lead', id: current.id, title: current.title, percent: percent(current.done, current.items), now: '', live: '', ...liveOf(s.lead, null, s.leadWork ?? null, nowMs) });
  }
  return { project: { name, percent: s.percent, state, left, checked }, agents: alignLive(agents) };
}
