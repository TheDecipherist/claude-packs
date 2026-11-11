// `claude-packs status`: where every unattended run stands, one line per project and one per agent, each with a bar (1.7.3;
// the user: "super simple with like a line graph ... PROJECT NAME (PROGRESS 0% - 100%) > AGENT X > STEP (PROGRESS 0% - 100%)").
//   status                 every run alive on this machine
//   status --dir <project> [--order <name>]   one project's orders, running or not
//   status --watch <minutes>                  the same again every so many minutes
import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { runningOrders } from './run-discovery.mjs';
import { orderStatus, percent } from './run-status.mjs';

export function bar(p, width) {
  const full = Math.round((Math.max(0, Math.min(100, p)) / 100) * width);
  return `[${'█'.repeat(full)}${'░'.repeat(width - full)}]`;
}

const pct = (p) => `${String(Math.round(p)).padStart(3)}%`;

/** The report's lines for one order: the project's line, then one line per agent (or the lead's step when none runs). */
export function statusLines(s) {
  const name = basename(s.project).toUpperCase() + (s.order === basename(s.project) ? '' : ` (${s.order})`);
  const state = s.finished ? 'done' : `${s.items - s.done} of ${s.items} items left, ${s.agents.length} agent${s.agents.length === 1 ? '' : 's'}`;
  const out = [`${name.padEnd(24)} ${bar(s.percent, 20)} ${pct(s.percent)}   ${state}`];
  const row = (who, id, title, p, now = '') => `  > ${who.padEnd(10)} > ${`${id ?? '?'} ${(title ?? '').slice(0, 22)}`.padEnd(28)} ${bar(p, 10)} ${pct(p)}${now ? `   ${now.slice(0, 50)}` : ''}`;
  for (const a of s.agents) {
    const stepOf = s.steps.find((x) => x.id === a.step);
    out.push(row(a.name, a.step, a.title || stepOf?.title, a.percent ?? (stepOf ? percent(stepOf.done, stepOf.items) : 0), a.now));
  }
  const current = s.steps.find((x) => x.done < x.items);
  if (s.agents.length === 0 && current && !s.finished) out.push(row('lead', current.id, current.title, percent(current.done, current.items)));
  return out;
}

function ordersIn(project, only) {
  if (only) return [only];
  try { return readdirSync(join(project, 'docs', 'workorders'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
}

export function statusReport({ dir = null, order = null } = {}) {
  const runs = dir ? ordersIn(dir, order).map((o) => ({ project: dir, order: o })) : runningOrders();
  if (runs.length === 0) return [dir ? `no work orders in ${dir}` : 'no unattended run is alive on this machine'];
  return runs.flatMap((r) => statusLines(orderStatus(r.project, r.order)));
}

export async function statusCommand(args, { log = console.log, wait = (ms) => new Promise((ok) => setTimeout(ok, ms)), ticks = Infinity } = {}) {
  const at = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
  const every = Number(at('--watch'));
  for (let tick = 0; tick < (every > 0 ? ticks : 1); tick += 1) {
    if (tick > 0) await wait(every * 60_000);
    if (every > 0) log(`-- ${new Date().toLocaleTimeString()}`);
    for (const line of statusReport({ dir: at('--dir'), order: at('--order') })) log(line);
  }
  return 0;
}
