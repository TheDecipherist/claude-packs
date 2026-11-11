// One work order's progress (1.7.3, the user: "it reports which projects its working on, how many agents per project, where
// they are, and how much is left"). The unit is the item: a step's numbered items plus one for its Done when.
//   - The run's own `docs/workorders/<order>/status.json` wins when it exists: { steps: [{ id, title, items, done, agent }],
//     agents: [{ name, worktree, step, started }] }, and each agent's `docs/workorders/<order>/agents/<name>.json` in its own
//     worktree: { name, step, items, done, now, updated }.
//   - Without it the progress is derived: the steps and their item counts from workorder.md, the items done from the
//     `W<n>.<item>` progress lines of the main checkout and of every agent worktree, a step counted whole once a line says done.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/shell-writes.mjs';

const ID = String.raw`[A-Z]+\d+[a-z]?`;   // W3, W3b, L5: any order's step ids
const STEP = new RegExp(String.raw`^## (${ID})\. (.+?)\s*$`, 'gm');
const textIn = (file) => readText(file) ?? '';

/** A status file a run or an agent wrote, or null when there is none or it cannot be read (it is the run's, never trusted to parse). */
function statusFileIn(file) {
  const text = readText(file);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

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
  const status = statusFileIn(join(folder, 'status.json'));
  const fromRun = Array.isArray(status?.steps) && status.steps.length > 0;
  const steps = fromRun
    ? status.steps.map((s) => ({ id: s.id, title: s.title ?? '', items: s.items || 1, done: Math.min(s.done ?? 0, s.items || 1), agent: s.agent ?? null }))
    : derivedSteps(project, order, trees);
  const listed = new Map((status?.agents ?? []).map((a) => [a.name, a]));
  const agents = trees.map((t) => ({ ...t, file: statusFileIn(join(t.path, 'docs', 'workorders', order, 'agents', `${t.name}.json`)) }))
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
