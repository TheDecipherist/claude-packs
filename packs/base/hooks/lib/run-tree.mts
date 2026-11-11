// The runs as a tree, the one shape `status` and the status line both draw (1.8.1): a project, its orders under it when it has
// more than one, each order's agents under the order. The user: "but why is that not under the VSYNTHGT project?", "> lead
// should not be on a new line should it? it looks confusing. cant see what really belongs to the VSYNTHGT project".
//   PC: SHOP         ...  59%  41 of 99 items left, 2 orders
//   ├ api            ...  60%  32 of 80 items left, lead on W9 The import
//   └ web            ...  53%  9 of 19 items left, lead on L2 The checkout page
//   MAC: BILLING     ...  47%  40 of 76 items left, 4 agents
//   ├ invoices > W3b The ledger    ...
//   └ emails   > W8 The templates  ...
// A lead working alone is said on its order's row, never as a row of its own.
import { basename } from 'node:path';
import { checkedText, workLine } from './run-live.mts';
import { percent } from './run-progress.mts';
import { projectOf, runRows, type AgentRow, type OrderStatus } from './run-rows.mts';

/** One machine's one project: its orders and the sums over them. */
export interface ProjectGroup { name: string; runs: OrderStatus[]; items: number; done: number; percent: number; state: string }

/** A row to draw: a project's or an order's head, or one agent under an order. */
export type TreeRow =
  | { kind: 'project' | 'order'; prefix: string; name: string; percent: number; state: string; live: string; quiet: number }
  | ({ kind: 'agent'; prefix: string } & AgentRow);

interface OrderLook { prefix: string; childPrefix: string; label: string | null; nowMs: number; checkedAt: string | null; top: boolean }

/** The runs grouped by machine and project, in the order first seen: [{ name: "PC: VSYNTHGT", percent, items, done, state, runs }]. */
export function projectGroups(runs: readonly OrderStatus[]): ProjectGroup[] {
  const groups = new Map<string, { name: string; runs: OrderStatus[] }>();
  for (const r of runs) {
    const key = `${r.host ?? ''}\0${projectOf(r.project)}`;
    let group = groups.get(key);
    if (!group) {
      group = { name: `${r.host ? `${r.host.toUpperCase()}: ` : ''}${basename(projectOf(r.project)).toUpperCase()}`, runs: [] };
      groups.set(key, group);
    }
    group.runs.push(r);
  }
  return [...groups.values()].map((g) => {
    const items = g.runs.reduce((n, r) => n + r.items, 0);
    const done = g.runs.reduce((n, r) => n + r.done, 0);
    const state = g.runs.every((r) => r.finished) ? 'done' : `${items - done} of ${items} items left, ${g.runs.length} orders`;
    return { ...g, items, done, percent: percent(done, items), state };
  });
}

const branch = (i: number, n: number): string => (i === n - 1 ? '└ ' : '├ ');   // └ for the last child, ├ for the others
const under = (i: number, n: number): string => (i === n - 1 ? '  ' : '│ ');          // what a last child's children hang from: blank, else │

/** One order's rows: its head row (with the lead on it when no agent runs) and one row per agent. `top`: the order is its
 *  project's row, so it also says when the runs were checked (once per project, never on every order). */
function orderRows(r: OrderStatus, { prefix, childPrefix, label, nowMs, checkedAt, top }: OrderLook): TreeRow[] {
  const { project, agents } = runRows(r, nowMs, checkedAt);
  const first = agents[0];
  const lead = agents.length === 1 && first?.who === 'lead' ? first : null;
  // the lead's own work, on its order's row, agents or not: its builds and gates are often the machine's real work
  const live = lead ? (/[♥⚙]/.test(lead.live) ? lead.live.trim() : '') : r.leadWork?.procs ? `lead ${workLine(r.leadWork)}` : '';
  const crew = lead ? `, lead on ${lead.id} ${lead.title.slice(0, 26)}` : agents.length ? `, ${agents.length} agent${agents.length === 1 ? '' : 's'}` : '';
  const state = `${project.left}${crew}${top ? project.checked : ''}`;
  const head: TreeRow = { kind: 'order', prefix, name: label ?? project.name, percent: project.percent, state, live, quiet: lead?.quiet ?? 0 };
  const kids = lead ? [] : agents;
  return [head, ...kids.map((a, i): TreeRow => ({ kind: 'agent', prefix: childPrefix + branch(i, kids.length), ...a }))];
}

/** Every row to draw, in order: { kind: 'project' | 'order' | 'agent', prefix, ... }. */
export function runTree(runs: readonly OrderStatus[], nowMs: number = Date.now(), checkedAt: string | null = null): TreeRow[] {
  const checked = checkedText(checkedAt, nowMs);
  return projectGroups(runs).flatMap((g): TreeRow[] => {
    const only = g.runs[0];
    if (g.runs.length === 1 && only) return orderRows(only, { prefix: '', childPrefix: '', label: null, nowMs, checkedAt, top: true });
    const n = g.runs.length;
    return [{ kind: 'project', prefix: '', name: g.name, percent: g.percent, state: `${g.state}${checked}`, live: '', quiet: 0 },
      ...g.runs.flatMap((r, i) => orderRows(r, { prefix: branch(i, n), childPrefix: under(i, n), label: r.order, nowMs, checkedAt, top: false }))];
  });
}
