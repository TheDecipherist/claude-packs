// One work order's progress (1.7.3, the user: "it reports which projects its working on, how many agents per project, where
// they are, and how much is left"). The unit is the item: a step's numbered items plus one for its Done when.
//   - The run's own `docs/workorders/<order>/status.json` wins when it exists: { steps: [{ id, title, items, done, agent }],
//     agents: [{ name, worktree, step, started }] }, and each agent's `docs/workorders/<order>/agents/<name>.json` in its own
//     worktree: { name, step, items, done, now, updated }.
//   - Without it the progress is derived: the steps and their item counts from workorder.md, the items done from the
//     `W<n>.<item>` progress lines of the main checkout and of every agent worktree, a step counted whole once a line says done.
// It lives with the hooks (1.8.0) because every project's status line runs it from there; lib/run-status.mjs re-exports it.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readJson } from './json.mjs';
import { runningOrders } from './run-discovery.mjs';
import { readText } from './shell-writes.mjs';

const ID = String.raw`[A-Z]+\d+[a-z]?`;   // W3, W3b, L5: any order's step ids
const STEP = new RegExp(String.raw`^## (${ID})\. (.+?)\s*$`, 'gm');
const QUIET_MIN = 30;   // an agent whose own file has not moved in this long is called quiet
const textIn = (file) => readText(file) ?? '';

/** The order's steps from workorder.md: [{ id, title, items }], items its numbered lines plus its Done when. */
export function stepsOf(workorderText) {
  const heads = [...workorderText.matchAll(STEP)];
  return heads.map((m, i) => {
    const body = workorderText.slice(m.index + m[0].length, heads[i + 1]?.index ?? workorderText.length);
    return { id: m[1], title: m[2].replace(/\*\*\[.*?\]\*\*/g, '').trim(), items: (body.match(/^\d+\. /gm) ?? []).length + 1 };
  });
}

/** From progress lines: the item numbers seen per step, and the steps a line calls done. */
export function progressOf(lines) {
  const seen = {};
  const done = new Set();
  for (const line of lines) {
    for (const [, id, item] of line.matchAll(new RegExp(String.raw`\b(${ID})\.(\d+)\b`, 'g'))) (seen[id] ??= new Set()).add(Number(item));
    for (const [, id] of line.matchAll(new RegExp(String.raw`\b(${ID})(?: measured,)? done\b`, 'g'))) done.add(id);
  }
  return { seen, done };
}

/** The agent worktrees of a project: [{ name, path }]. */
export function worktreesOf(project) {
  let out = '';
  try { out = execFileSync('git', ['-C', project, 'worktree', 'list', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return []; }
  return out.split('\n').filter((l) => l.startsWith('worktree ') && l.includes('/.claude/worktrees/')).map((l) => {
    const path = l.slice('worktree '.length);
    return { name: basename(path), path };
  });
}

export const percent = (done, items) => (items ? Math.round((1000 * done) / items) / 10 : 0);

/** A bar's cells for a percent, [filled, empty]: `status` and the status line draw the same rounding. */
export function barCells(p, width) {
  const full = Math.round((Math.max(0, Math.min(100, p || 0)) / 100) * width);
  return [full, width - full];
}

/** A percent as the bar's label, `  7%`, ` 47%`, `100%`. */
export const percentLabel = (p) => `${String(Math.round(p || 0)).padStart(3)}%`;

function derivedSteps(project, order, trees) {
  const folders = [join(project, 'docs', 'workorders', order), ...trees.map((t) => join(t.path, 'docs', 'workorders', order))];
  const { seen, done } = progressOf(folders.flatMap((f) => textIn(join(f, 'progress.md')).split('\n')));
  return stepsOf(textIn(join(folders[0], 'workorder.md'))).map((s) => ({
    ...s, done: done.has(s.id) ? s.items : Math.min(seen[s.id]?.size ?? 0, s.items - 1), agent: null,
  }));
}

/** One order's progress: { project, order, steps, agents, items, done, percent, source, finished }. */
export function orderStatus(project, order) {
  const folder = join(project, 'docs', 'workorders', order);
  const trees = worktreesOf(project);
  const status = readJson(join(folder, 'status.json'));   // the run's file: a broken one is no file, never a crash
  const fromRun = Array.isArray(status?.steps) && status.steps.length > 0;
  const steps = fromRun
    ? status.steps.map((s) => ({ id: s.id, title: s.title ?? '', items: s.items || 1, done: Math.min(s.done ?? 0, s.items || 1), agent: s.agent ?? null }))
    : derivedSteps(project, order, trees);
  const listed = new Map((status?.agents ?? []).map((a) => [a.name, a]));
  const agents = trees.map((t) => ({ ...t, file: readJson(join(t.path, 'docs', 'workorders', order, 'agents', `${t.name}.json`)) }))
    .filter((t) => t.file || listed.has(t.name))
    .map((t) => {
      const f = t.file ?? {};
      const step = f.step ?? listed.get(t.name)?.step ?? null;
      return { name: t.name, step, title: steps.find((s) => s.id === step)?.title ?? '', now: f.now ?? '', updated: f.updated ?? null,
        percent: f.items ? percent(f.done ?? 0, f.items) : null };
    });
  const items = steps.reduce((n, s) => n + s.items, 0);
  const done = steps.reduce((n, s) => n + s.done, 0);
  return { project, order, steps, agents, items, done, percent: percent(done, items), source: fromRun ? 'status.json' : 'progress lines',
    finished: existsSync(join(folder, 'DONE')) };
}

/** One order's rows, the same for `status` and the status line: the project's, then one per agent, or the lead's current step
 *  when no agent runs. { project: { name, percent, state }, agents: [{ who, id, title, percent, now, quiet }] }. */
export function runRows(s, nowMs = Date.now()) {
  const base = basename(s.project).toUpperCase();
  const name = base + (s.order && s.order.toUpperCase() !== base ? ` (${s.order})` : '');
  const n = s.agents.length;
  const state = s.finished ? 'done' : `${s.items - s.done} of ${s.items} items left, ${n} agent${n === 1 ? '' : 's'}`;
  const stepOf = (id) => s.steps.find((x) => x.id === id);
  const agents = s.finished ? [] : s.agents.map((a) => {
    const step = stepOf(a.step);
    const since = Date.parse(a.updated ?? '');
    const quiet = Number.isNaN(since) ? 0 : Math.round((nowMs - since) / 60000);
    return { who: a.name, id: a.step, title: a.title || step?.title || '', percent: a.percent ?? (step ? percent(step.done, step.items) : 0),
      now: a.now ?? '', quiet: quiet >= QUIET_MIN ? quiet : 0 };
  });
  const current = s.steps.find((x) => x.done < x.items);
  if (!s.finished && n === 0 && current) agents.push({ who: 'lead', id: current.id, title: current.title, percent: percent(current.done, current.items), now: '', quiet: 0 });
  return { project: { name, percent: s.percent, state }, agents };
}

function ordersIn(project, only) {
  if (only) return [only];
  try { return readdirSync(join(project, 'docs', 'workorders'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
}

/** Every run's progress: { updated, dir, runs: [orderStatus] }, the runs alive on this machine, or one project's orders. */
export function runsReport({ dir = null, order = null } = {}) {
  const runs = dir ? ordersIn(dir, order).map((o) => ({ project: dir, order: o })) : runningOrders();
  return { updated: new Date().toISOString(), dir, runs: runs.map((r) => orderStatus(r.project, r.order)) };
}
