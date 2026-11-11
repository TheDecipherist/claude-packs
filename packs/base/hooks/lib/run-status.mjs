// One work order's progress (1.7.3, the user: "it reports which projects its working on, how many agents per project, where
// they are, and how much is left"). The unit is the item: a step's numbered items plus one for its Done when.
//   - The run's own `docs/workorders/<order>/status.json` wins when it exists: { steps: [{ id, title, items, done, agent }],
//     agents: [{ name, worktree, step, started }] }, and each agent's `docs/workorders/<order>/agents/<name>.json` in its own
//     worktree: { name, step, items, done, now, updated }.
//   - Without it the progress is derived: the steps and their item counts from workorder.md, the items done from the
//     `W<n>.<item>` progress lines of the main checkout and of every agent worktree, a step counted whole once a line says done.
// It lives with the hooks (1.8.0) because every project's status line runs it from there; lib/run-status.mjs re-exports it.
import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { readJson } from './json.mjs';
import { commitsAhead, mergedInto, processesOf, runningOrders, workIn, worktreesOf } from './run-discovery.mjs';
import { machineName, remotesOf, remotesReport } from './run-remotes.mjs';
import { transcriptBeats } from './run-transcripts.mjs';
import { readText } from './shell-writes.mjs';

const ID = String.raw`[A-Z]+\d+[a-z]?`;   // W3, W3b, L5: any order's step ids
const STEP = new RegExp(String.raw`^## (${ID})\. (.+?)\s*$`, 'gm');
// The heartbeat hook sees every tool call, before and after; between the two ends of one long call (a build, a test run)
// the check of what runs in the agent's worktree says whether it still works. So an agent is quiet when:
const QUIET_MIN = 5;       // it made no call for this long (longer than any answer the model writes), or its call runs with
                           // nothing left working in its worktree for this long
const RUNNING_MIN = 30;    // where the processes cannot be read: one call running this long
const LIVE_MS = 60 * 60_000;   // a worktree whose heartbeat is younger than this is a live agent, file or not
const KIN_MS = 2 * 60 * 60_000; // an agent branch merged back and untouched this long is a finished agent
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

/** The items the agents are ahead of the run's own count. The lead writes status.json when it starts and when an agent's
 *  work is merged, and while its agents work its turn waits on them, so its count stands still for hours (the user: "none
 *  of the percent numbers have moved in a long time"). Each agent's own file moves after every item: for the steps it owns,
 *  its percent of their items counts where that is further along than the run's. */
function agentsAhead(steps, agents) {
  return agents.filter((a) => a.percent !== null).reduce((n, a) => {
    const owned = steps.filter((s) => s.agent === a.name);
    const items = owned.reduce((m, s) => m + s.items, 0);
    const counted = owned.reduce((m, s) => m + s.done, 0);
    return n + Math.max(0, Math.round((items * a.percent) / 100) - counted);
  }, 0);
}

/** One order's progress: { project, order, steps, agents, items, done, percent, source, finished }. */
export function orderStatus(project, order) {
  const folder = join(project, 'docs', 'workorders', order);
  const trees = worktreesOf(project, process.env);
  const status = readJson(join(folder, 'status.json'));   // the run's file: a broken one is no file, never a crash
  const fromRun = Array.isArray(status?.steps) && status.steps.length > 0;
  const steps = fromRun
    ? status.steps.map((s) => ({ id: s.id, title: s.title ?? '', items: s.items || 1, done: Math.min(s.done ?? 0, s.items || 1), agent: s.agent ?? null }))
    : derivedSteps(project, order, trees);
  const listed = new Map((status?.agents ?? []).map((a) => [a.name, a]));
  // the heartbeat hook's file, else the agent's last call in Claude Code's own transcripts (an install with no heartbeat yet)
  const fromTranscripts = transcriptBeats(project);
  const beatOf = (name) => readJson(join(project, '.claude', 'logs', 'heartbeats', `${name}.json`)) ?? fromTranscripts[name] ?? null;
  const alive = (beat) => beat && Date.now() - Date.parse(beat.t ?? '') < LIVE_MS;
  // an agent of this order with nothing written yet still counts: its worktree is on the order's own branch, work/<order>-<name>
  // (the user: "I dont see those 5 agents"); one merged back and untouched for KIN_MS is a finished agent, unless work runs in it
  const kin = (t) => typeof t.branch === 'string' && t.branch.startsWith(`work/${order}-`);
  const stale = (t) => Date.now() - t.touched > KIN_MS && mergedInto(project, t.branch, `work/${order}`, process.env);
  const agents = trees.map((t) => ({ ...t, file: readJson(join(t.path, 'docs', 'workorders', order, 'agents', `${t.name}.json`)), beat: beatOf(t.name) }))
    .map((t) => { const known = Boolean(t.file || listed.has(t.name) || alive(t.beat)); return { ...t, known, kinOnly: !known && kin(t) }; })
    .filter((t) => t.known || t.kinOnly)
    .map((t) => ({ ...t, stale: t.kinOnly && stale(t), fresh: t.kinOnly && commitsAhead(project, t.branch, `work/${order}`, process.env) === 0 }))   // runsReport drops a stale one unless work runs in it
    .map((t) => {
      const f = t.file ?? {};
      const step = f.step ?? listed.get(t.name)?.step ?? null;
      // no file of its own yet: git's last touch of its worktree is its clock
      const updated = f.updated ?? (t.kinOnly && t.touched ? new Date(t.touched).toISOString() : null);
      return { name: t.name, step, title: steps.find((s) => s.id === step)?.title ?? '', now: f.now ?? '', state: f.state ?? null, updated,
        percent: f.items ? percent(f.done ?? 0, f.items) : null, beat: t.beat ?? null, path: t.path, stale: t.stale, fresh: t.fresh };
    });
  const items = steps.reduce((n, s) => n + s.items, 0);
  const done = steps.reduce((n, s) => n + s.done, 0) + agentsAhead(steps, agents);
  return { project, order, steps, agents, items, done, percent: percent(done, items), source: fromRun ? 'status.json' : 'progress lines',
    finished: existsSync(join(folder, 'DONE')), lead: beatOf('lead') };
}

// 12s, 4m, 1h05m: every part with its unit
const ago = (sec) => (sec < 60 ? `${sec}s` : sec < 3600 ? `${Math.round(sec / 60)}m` : `${Math.floor(sec / 3600)}h${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}m`);

// What kind of action each tool is, for "last action: READ" (the user: "can it show Last action : READ|WRITE"); a tool
// not listed shows its own name.
const ACTIONS = { Read: 'READ', Grep: 'READ', Glob: 'READ', LS: 'READ', WebFetch: 'READ', WebSearch: 'READ', NotebookRead: 'READ',
  Write: 'WRITE', Edit: 'WRITE', MultiEdit: 'WRITE', NotebookEdit: 'WRITE', Bash: 'RUN', Agent: 'AGENT', Task: 'AGENT' };
export const actionOf = (tool) => (Object.hasOwn(ACTIONS, tool) ? ACTIONS[tool] : String(tool || '?').toUpperCase());

// The live part of an agent's row, in symbols one column wide each (the user: "cant we show it condensed as symbols or
// icons?"), every value under the same value of the row above ("equally placed under each other"), each column as wide
// as its widest value in that run and no wider ("still to much space"); the README has the legend:
//   ♥ 12s       its last heartbeat, that long ago (♡: the project has no heartbeat hook yet)
//   ⚙ 13 · 1.6c · 353M queued   what runs in its worktree: processes, cores, memory; queued: its build waits for a slot;
//                               ⚙ 0: nothing runs there (it is thinking or reading, which happens in Claude's own process)
//   ⟳ RUN <target>   its last action, READ | WRITE | RUN | AGENT; ⟳ while that call still runs
export const SYMBOLS = { beat: '♥', noBeat: '♡', running: '⟳', work: '⚙' };
const memText = (mb) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)}G` : `${Math.round(mb)}M`);
const WORK_PARTS = { procs: (w) => String(w.procs), cores: (w) => (w.cores ?? 0).toFixed(1), mem: (w) => memText(w.memMb ?? 0) };

/** What runs in one checkout, in a line: "⚙ 2 proc · 1.0 cpu · 300M ram" (an order's row, where the columns are its own). */
export const workLine = (w) => `${SYMBOLS.work} ${WORK_PARTS.procs(w)} proc · ${WORK_PARTS.cores(w)} cpu · ${WORK_PARTS.mem(w)} ram${w.queued ? ' queued' : ''}`;

/** Each agent's `live` from its parts: every column the width of its widest value among these rows, single spaces between,
 *  an empty column left out; processes, cores and memory always (zeros too), "queued" after them, so numbers line up. */
function alignLive(rows) {
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
const STILL_ON_PURPOSE = new Set(['paused', 'waiting', 'finished']);

function liveOf(beat, updated, work, nowMs) {
  const at = (iso) => { const t = Date.parse(iso ?? ''); return Number.isNaN(t) ? null : t; };
  const beatAt = at(beat?.t);
  const last = Math.max(beatAt ?? -Infinity, at(updated) ?? -Infinity);
  const still = last === -Infinity ? null : Math.max(0, Math.round((nowMs - last) / 1000));
  const running = beatAt !== null && beat.event === 'pre' && last === beatAt;
  const quietFor = (min) => still !== null && still / 60 >= min;
  // the heartbeat: every call, so 5 minutes still is stuck; a running call is stuck only with nothing working in its
  // worktree; with no heartbeat (an install from before the hook) the agent's own file moves once an item: the long rule,
  // unless the check sees work in its worktree
  const stuck = beatAt === null ? !work?.procs && quietFor(RUNNING_MIN) : !running ? quietFor(QUIET_MIN) : work ? work.procs === 0 && quietFor(QUIET_MIN) : quietFor(RUNNING_MIN);
  const quiet = stuck ? Math.round(still / 60) : 0;
  const beatText = beatAt !== null ? `${SYMBOLS.beat} ${ago(Math.max(0, Math.round((nowMs - beatAt) / 1000)))}` : `${SYMBOLS.noBeat}${quiet ? ` ${ago(still)}` : ''}`;
  const action = beatAt !== null ? `${running ? `${SYMBOLS.running} ` : ''}${actionOf(beat.tool)}${beat.what ? ` ${beat.what}` : ''}` : '';
  return { beat: beatText, work, action, quiet };
}

/** ", checked 8s ago" from when the runs were checked (the status line's cache), or '' when that is not known. */
export const checkedText = (checkedAt, nowMs) =>
  (Number.isNaN(Date.parse(checkedAt ?? '')) ? '' : `, checked ${ago(Math.max(0, Math.round((nowMs - Date.parse(checkedAt)) / 1000)))} ago`);

// a run in a worktree is its project's: VSYNTHGT, never the worktree's folder W12-LOOK (the user: "what is W12-LOOK?")
export const projectOf = (path) => path.replace(/\/\.claude\/worktrees\/[^/]+(?:\/.*)?$/, '');

/** One order's rows, the same for `status` and the status line: the project's, then one per agent, or the lead's current step
 *  when no agent runs. { project: { name, percent, state }, agents: [{ who, id, title, percent, now, live, quiet }] }.
 *  `checkedAt`: when the runs were last checked (the status line's cache), said on the project's row. */
export function runRows(s, nowMs = Date.now(), checkedAt = null) {
  const base = basename(projectOf(s.project)).toUpperCase();
  const name = (s.host ? `${s.host.toUpperCase()}: ` : '') + base + (s.order && s.order.toUpperCase() !== base ? ` (${s.order})` : '');
  const n = s.agents.length;
  const checked = checkedText(checkedAt, nowMs);
  const left = s.finished ? 'done' : `${s.items - s.done} of ${s.items} items left`;
  const crew = s.finished ? '' : `, ${n} agent${n === 1 ? '' : 's'}`;
  const state = left + crew + checked;
  const stepOf = (id) => s.steps.find((x) => x.id === id);
  const agents = s.finished ? [] : s.agents.map((a) => {
    const step = stepOf(a.step);
    // an agent seen by its worktree alone has said nothing yet: no step, said in words (never "?"); a worktree whose branch has
    // no commit of its own and nothing running is one waiting for its agent (the user: "all the mac agents say they are not
    // doing anything")
    const waiting = !a.step && a.fresh && !a.work?.procs;
    // still on purpose (its own file: "state" paused, waiting or finished, or `now` starting so) is never stuck: red means
    // something is wrong (KWB-164)
    const paused = STILL_ON_PURPOSE.has(a.state) || /^(?:paused|waiting|finished)\b/i.test(a.now ?? '');
    return { who: a.name, id: a.step ?? '', title: a.step ? (a.title || step?.title || '') : waiting ? 'not started yet' : 'no status file yet', percent: a.percent ?? (step ? percent(step.done, step.items) : 0),
      now: a.now ?? '', ...liveOf(a.beat, a.updated, a.work ?? null, nowMs), ...(paused ? { quiet: 0, paused: true, action: '', work: null } : {}) };   // KWB-167: a stopped agent shows no last action or counts
  });
  const current = s.steps.find((x) => x.done < x.items);
  if (!s.finished && n === 0 && current) {
    agents.push({ who: 'lead', id: current.id, title: current.title, percent: percent(current.done, current.items), now: '', ...liveOf(s.lead, null, s.leadWork ?? null, nowMs) });
  }
  return { project: { name, percent: s.percent, state, left, checked }, agents: alignLive(agents) };
}

function ordersIn(project, only) {
  if (only) return [only];
  try { return readdirSync(join(project, 'docs', 'workorders'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
}

/** Every run's progress: { updated, dir, runs: [orderStatus], unreachable: [{ host, why }] }: the runs alive on this machine
 *  and on every machine remotes.json lists (1.8.1), or one project's orders here (`dir`). */
export function runsReport({ dir = null, order = null, remotes = undefined, ask = undefined, here = undefined } = {}) {
  const notes = [];   // what could not be looked at (KWB-161: Windows' sessions), said, never silence
  const runs = (dir ? ordersIn(dir, order).map((o) => ({ project: dir, order: o })) : runningOrders({ env: process.env, platform: process.platform, notes })).map((r) => orderStatus(r.project, r.order));
  // the check: what really runs in each agent's worktree now, and in the checkout the lead works in (the user: "and what
  // happened to the heartbeat and cores and all that?"); a process counts for the deepest folder, so an agent's build is its own
  const work = workIn([...runs.map((r) => r.project), ...runs.flatMap((r) => r.agents.map((a) => a.path))], processesOf(process.env));
  for (const a of runs.flatMap((r) => r.agents)) a.work = work?.[a.path] ?? null;
  for (const r of runs) r.agents = r.agents.filter((a) => !a.stale || a.work?.procs);   // a finished agent's worktree, unless work runs in it
  for (const r of runs) r.leadWork = work?.[r.project] ?? null;
  const listed = dir ? [] : (remotes ?? remotesOf());
  const far = remotesReport(listed, ask);
  // with other machines listed, every run says where it runs, this machine's own too; alone, no names
  const name = listed.length ? (here ?? machineName()) : null;
  const mine = name ? runs.map((r) => ({ ...r, host: name })) : runs;
  return { updated: new Date().toISOString(), dir, runs: [...mine, ...far.runs], unreachable: far.unreachable, notes };
}
