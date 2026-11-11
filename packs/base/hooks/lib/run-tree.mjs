// The runs as a tree, the one shape `status` and the status line both draw (1.8.1): a project, its orders under it when it has
// more than one, each order's agents under the order. The user: "but why is that not under the VSYNTHGT project?", "> lead
// should not be on a new line should it? it looks confusing. cant see what really belongs to the VSYNTHGT project".
//   PC: VSYNTHGT     ...  59%  41 of 99 items left, 2 orders
//   ├ rebuild        ...  60%  32 of 80 items left, lead on W9 The engine: the sound
//   └ ui-look        ...  53%  9 of 19 items left, lead on L2 The panel fixed
//   MAC: BANDWARP    ...  47%  40 of 76 items left, 4 agents
//   ├ dsp      > W3b The cluster   ...
//   └ panel    > W8 The main panel ...
// A lead working alone is said on its order's row, never as a row of its own.
import { basename } from 'node:path';
import { checkedText, percent, projectOf, runRows } from './run-status.mjs';

/** The runs grouped by machine and project, in the order first seen: [{ name: "PC: VSYNTHGT", percent, items, done, state, runs }]. */
export function projectGroups(runs) {
  const groups = new Map();
  for (const r of runs) {
    const key = `${r.host ?? ''}\0${projectOf(r.project)}`;
    if (!groups.has(key)) groups.set(key, { name: `${r.host ? `${r.host.toUpperCase()}: ` : ''}${basename(projectOf(r.project)).toUpperCase()}`, runs: [] });
    groups.get(key).runs.push(r);
  }
  return [...groups.values()].map((g) => {
    const items = g.runs.reduce((n, r) => n + r.items, 0);
    const done = g.runs.reduce((n, r) => n + r.done, 0);
    const state = g.runs.every((r) => r.finished) ? 'done' : `${items - done} of ${items} items left, ${g.runs.length} orders`;
    return { ...g, items, done, percent: percent(done, items), state };
  });
}

const branch = (i, n) => (i === n - 1 ? '└ ' : '├ ');   // └ for the last child, ├ for the others
const under = (i, n) => (i === n - 1 ? '  ' : '│ ');          // what a last child's children hang from: blank, else │

/** One order's rows: its head row (with the lead on it when no agent runs) and one row per agent. `top`: the order is its
 *  project's row, so it also says when the runs were checked (once per project, never on every order). */
function orderRows(r, { prefix, childPrefix, label, nowMs, checkedAt, top }) {
  const { project, agents } = runRows(r, nowMs, checkedAt);
  const lead = agents.length === 1 && agents[0].who === 'lead' ? agents[0] : null;
  const live = lead && /[♥⚙]/.test(lead.live) ? lead.live.trim() : '';   // the lead's heartbeat or work, when there is one
  const crew = lead ? `, lead on ${lead.id} ${lead.title.slice(0, 26)}` : agents.length ? `, ${agents.length} agent${agents.length === 1 ? '' : 's'}` : '';
  const state = `${project.left}${crew}${top ? project.checked : ''}`;
  const head = { kind: 'order', prefix, name: label ?? project.name, percent: project.percent, state, live, quiet: lead?.quiet ?? 0 };
  const kids = lead ? [] : agents;
  return [head, ...kids.map((a, i) => ({ kind: 'agent', prefix: childPrefix + branch(i, kids.length), ...a }))];
}

/** Every row to draw, in order: { kind: 'project' | 'order' | 'agent', prefix, ... }. */
export function runTree(runs, nowMs = Date.now(), checkedAt = null) {
  const checked = checkedText(checkedAt, nowMs);
  return projectGroups(runs).flatMap((g) => {
    if (g.runs.length === 1) return orderRows(g.runs[0], { prefix: '', childPrefix: '', label: null, nowMs, checkedAt, top: true });
    const n = g.runs.length;
    return [{ kind: 'project', prefix: '', name: g.name, percent: g.percent, state: `${g.state}${checked}`, live: '', quiet: 0 },
      ...g.runs.flatMap((r, i) => orderRows(r, { prefix: branch(i, n), childPrefix: under(i, n), label: r.order, nowMs, checkedAt, top: false }))];
  });
}
