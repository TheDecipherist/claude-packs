// One line per project for the status line (typescript order W8.9, the user: "the status line grows a row per agent and crowds out the prompt").
// The tree of run-tree.mts is `status`'s: a project, its orders, an agent under each. The status line has room for one row a project:
//   SHOP   ████████░░░░░░░░░░░░  47%  40 of 76 items left · W3b The import · 4 agents  ⚙ 12 proc · 3.4 cpu · 1.2G ram
// its progress as the orders report it, the step the lead is on, how many agents run, and what the lead and the agents run, summed. Each agent
// is the monitor's (`claude-packs top`), never a row here.
import { projectGroups } from './run-tree.mjs';
import { percent } from './run-progress.mjs';
const NO_WORK = { procs: 0, cores: 0, memMb: 0, queued: false };
const sumWork = (all) => all.reduce((sum, w) => (w
    ? { procs: sum.procs + (w.procs || 0), cores: sum.cores + (w.cores || 0), memMb: sum.memMb + (w.memMb || 0), queued: sum.queued || Boolean(w.queued) }
    : sum), NO_WORK);
/** The step an order's lead is on: its first step with items left, `W3b The import`; '' when none is left. */
const stepOf = (run) => {
    const current = run.steps.find((s) => s.done < s.items);
    return current ? [current.id, current.title].filter(Boolean).join(' ') : '';
};
/** One line for each project, the machine's name in front of a project on another machine; the orders of one project are one line. */
export function projectLines(runs) {
    return projectGroups(runs).map((g) => {
        const open = g.runs.filter((r) => !r.finished);
        const items = g.runs.reduce((n, r) => n + r.items, 0);
        const done = g.runs.reduce((n, r) => n + r.done, 0);
        const first = open[0];
        return {
            name: g.name, percent: percent(done, items), finished: open.length === 0,
            left: open.length === 0 ? 'done' : `${items - done} of ${items} items left`,
            step: first ? stepOf(first) : '',
            agents: open.reduce((n, r) => n + r.agents.length, 0),
            work: sumWork(open.flatMap((r) => [r.leadWork, ...r.agents.map((a) => a.work)])),
        };
    });
}
