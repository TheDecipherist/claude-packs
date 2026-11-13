// One work order's progress (1.7.3, the user: "it reports which projects its working on, how many agents per project, where
// they are, and how much is left"). The unit is the item: a step's numbered items plus one for its Done when.
//   - The run's own `docs/workorders/<order>/status.json` wins when it exists: { steps: [{ id, title, items, done, agent }],
//     agents: [{ name, worktree, step, started }] }, and each agent's `docs/workorders/<order>/agents/<name>.json` in its own
//     worktree: { name, step, items, done, now, updated }.
//   - Without it the progress is derived: the steps and their item counts from workorder.md, the items done from the
//     `W<n>.<item>` progress lines of the main checkout and of every agent worktree, a step counted whole once a line says done.
// It lives with the hooks (1.8.0) because every project's status line runs it from there; lib/run-status.mjs re-exports it.
// The step counting is run-progress, the live column run-live, the rows run-rows; they are re-exported here, so importers
// keep one name for the lot.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from './files.mts';
import { readJson } from './json.mts';
import { commitsAhead, mergedInto, processesOf, runningOrders, workIn, worktreesOf, type Env } from './run-discovery.mts';
import type { Beat } from './run-live.mts';
import { percent, progressOf, stepsOf, type Step } from './run-progress.mts';
import { machineName, remotesFile, remotesOf, remotesReport, sshAsk, type Asker, type Remote, type Unreachable } from './run-remotes.mts';
import type { AgentStatus, OrderStatus } from './run-rows.mts';
import { claudeHome, transcriptBeats } from './run-transcripts.mts';

export { barCells, percent, percentLabel, progressOf, stepsOf } from './run-progress.mts';
export { SYMBOLS, actionOf, checkedText, workLine } from './run-live.mts';
export { projectOf, runRows } from './run-rows.mts';
export type { AgentRow, AgentStatus, OrderStatus, ProjectRow } from './run-rows.mts';

const LIVE_MS = 60 * 60_000;   // a worktree whose heartbeat is younger than this is a live agent, file or not
const KIN_MS = 2 * 60 * 60_000; // an agent branch merged back and untouched this long is a finished agent

/** What a caller passes to read the runs: its environment, and the clock where a test plants one. */
export interface StatusInput { env: Env; nowMs?: number }

/** The run's own status.json, an agent's own file: outside data, narrowed where used. */
interface StatusFile { steps?: { id: string; title?: string; items?: number; done?: number; agent?: string | null }[]; agents?: { name: string; step?: string }[] }
interface AgentFile { step?: string; items?: number; done?: number; now?: string; updated?: string; state?: string }

function derivedSteps(project: string, order: string, trees: readonly { path: string }[]): Step[] {
  const folders = [join(project, 'docs', 'workorders', order), ...trees.map((t) => join(t.path, 'docs', 'workorders', order))];
  const { seen, done } = progressOf(folders.flatMap((f) => (readText(join(f, 'progress.md')) ?? '').split('\n')));
  return stepsOf(readText(join(folders[0] ?? '', 'workorder.md')) ?? '').map((s) => ({
    ...s, done: done.has(s.id) ? s.items : Math.min(seen[s.id]?.size ?? 0, s.items - 1), agent: null,
  }));
}

/** The items the agents are ahead of the run's own count. The lead writes status.json when it starts and when an agent's
 *  work is merged, and while its agents work its turn waits on them, so its count stands still for hours (the user: "none
 *  of the percent numbers have moved in a long time"). Each agent's own file moves after every item: for the steps it owns,
 *  its percent of their items counts where that is further along than the run's. */
function agentsAhead(steps: readonly Step[], agents: readonly AgentStatus[]): number {
  return agents.reduce((n, a) => {
    if (a.percent === null) return n;
    const owned = steps.filter((s) => s.agent === a.name);
    const items = owned.reduce((m, s) => m + s.items, 0);
    const counted = owned.reduce((m, s) => m + s.done, 0);
    return n + Math.max(0, Math.round((items * a.percent) / 100) - counted);
  }, 0);
}

/** One order's progress: { project, order, steps, agents, items, done, percent, source, finished }. */
export function orderStatus(project: string, order: string, { env, nowMs = Date.now() }: StatusInput): OrderStatus {
  const folder = join(project, 'docs', 'workorders', order);
  const trees = worktreesOf(project, env);
  const status = readJson<StatusFile>(join(folder, 'status.json'));   // the run's file: a broken one is no file, never a crash
  const ownSteps = Array.isArray(status?.steps) ? status.steps : [];
  const fromRun = ownSteps.length > 0;
  // the lead writes status.json at its own moments and its progress lines after every item, so a count that stands still while the lines
  // move (supernova2 read 0 % with W0.0 to W0.4 recorded, W8.9) is the file lagging: the step takes the further of the two
  const lines = fromRun ? derivedSteps(project, order, trees) : [];
  const steps: Step[] = fromRun
    ? ownSteps.map((s) => { const items = s.items || 1; return { id: s.id, title: s.title ?? '', items, done: Math.min(Math.max(s.done ?? 0, lines.find((l) => l.id === s.id)?.done ?? 0), items), agent: s.agent ?? null }; })
    : derivedSteps(project, order, trees);
  const listed = new Map((Array.isArray(status?.agents) ? status.agents : []).map((a) => [a.name, a]));
  // the heartbeat hook's file, else the agent's last call in Claude Code's own transcripts (an install with no heartbeat yet)
  const fromTranscripts = transcriptBeats(project, { home: claudeHome(env), nowMs });
  const beatOf = (name: string): Beat | null => readJson<Beat>(join(project, '.claude', 'logs', 'heartbeats', `${name}.json`)) ?? fromTranscripts[name] ?? null;
  const alive = (beat: Beat | null): boolean => beat !== null && nowMs - Date.parse(beat.t ?? '') < LIVE_MS;
  // an agent of this order with nothing written yet still counts: its worktree is on the order's own branch, work/<order>-<name>
  // (the user: "I dont see those 5 agents"); one merged back and untouched for KIN_MS is a finished agent, unless work runs in it
  const kin = (branch: string | null): boolean => typeof branch === 'string' && branch.startsWith(`work/${order}-`);
  const merged = (branch: string | null): boolean => branch !== null && mergedInto(project, branch, `work/${order}`, env);
  const stale = (t: { branch: string | null; touched: number }): boolean => nowMs - t.touched > KIN_MS && merged(t.branch);
  // its own file says done and its branch is merged: finished, whatever its worktree (KWB-188: 37 finished worktrees listed)
  const finished = (t: { branch: string | null; file: AgentFile | null }): boolean =>
    (t.file?.state === 'done' || (t.file?.items !== undefined && (t.file.done ?? 0) >= t.file.items)) && merged(t.branch);
  // nothing of its own for LIVE_MS: no heartbeat, no update of its file, its worktree untouched (ab-prep sat listed at 4 h and w10b-soak at 10 h, W8.9);
  // the report still shows it while a process works in its worktree, and a call or an update brings it back
  const idle = (t: { file: AgentFile | null; beat: Beat | null; touched: number }): boolean =>
    nowMs - Math.max(Date.parse(t.file?.updated ?? '') || 0, Date.parse(t.beat?.t ?? '') || 0, t.touched || 0) > LIVE_MS;
  const agents: AgentStatus[] = trees.map((t) => ({ ...t, file: readJson<AgentFile>(join(t.path, 'docs', 'workorders', order, 'agents', `${t.name}.json`)), beat: beatOf(t.name) }))
    .map((t) => { const known = Boolean(t.file || listed.has(t.name) || alive(t.beat)); return { ...t, known, kinOnly: !known && kin(t.branch) }; })
    .filter((t) => t.known || t.kinOnly)
    .map((t) => ({ ...t, stale: (t.kinOnly && stale(t)) || finished(t) || idle(t), fresh: t.kinOnly && t.branch !== null && commitsAhead(project, t.branch, `work/${order}`, env) === 0 }))   // runsReport drops a stale one unless work runs in it
    .map((t): AgentStatus => {
      const f: AgentFile = t.file ?? {};
      const step = f.step ?? listed.get(t.name)?.step ?? null;
      // no file of its own yet: git's last touch of its worktree is its clock
      const updated = f.updated ?? (t.kinOnly && t.touched ? new Date(t.touched).toISOString() : null);
      return { name: t.name, step, title: steps.find((s) => s.id === step)?.title ?? '', now: f.now ?? '', state: f.state ?? null, updated,
        percent: f.items ? percent(f.done ?? 0, f.items) : null, beat: t.beat, path: t.path, stale: t.stale, fresh: t.fresh };
    });
  const items = steps.reduce((n, s) => n + s.items, 0);
  const done = steps.reduce((n, s) => n + s.done, 0) + agentsAhead(steps, agents);
  return { project, order, steps, agents, items, done, percent: percent(done, items), source: fromRun ? 'status.json' : 'progress lines',
    finished: existsSync(join(folder, 'DONE')), lead: beatOf('lead') };
}

function ordersIn(project: string, only: string | null): string[] {
  if (only) return [only];
  try { return readdirSync(join(project, 'docs', 'workorders'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
}

/** What `runsReport` takes: the caller's environment and platform, and (to plant them in a test) the machines, the ssh ask,
 *  this machine's name and the clock. `dir`: one project's orders here, else every run alive. */
export interface RunsInput {
  env: Env;
  platform: string;
  dir?: string | null;
  order?: string | null;
  remotes?: readonly Remote[];
  ask?: Asker;
  here?: string;
  nowMs?: number;
}

/** Every run's progress: the runs alive on this machine and on every machine remotes.json lists (1.8.1), or one project's
 *  orders here (`dir`); what could not be looked at is said, never silence. */
export function runsReport({ env, platform, dir = null, order = null, remotes, ask, here, nowMs = Date.now() }: RunsInput):
  { updated: string; dir: string | null; runs: OrderStatus[]; unreachable: Unreachable[]; notes: string[] } {
  const notes: string[] = [];   // what could not be looked at (KWB-161: Windows' sessions)
  const found = dir ? ordersIn(dir, order).map((o) => ({ project: dir, order: o })) : runningOrders({ env, platform, notes, nowMs });
  const runs = found.map((r) => orderStatus(r.project, r.order, { env, nowMs }));
  // the check: what really runs in each agent's worktree now, and in the checkout the lead works in (the user: "and what
  // happened to the heartbeat and cores and all that?"); a process counts for the deepest folder, so an agent's build is its own
  const work = workIn([...runs.map((r) => r.project), ...runs.flatMap((r) => r.agents.map((a) => a.path))], processesOf(env));
  for (const a of runs.flatMap((r) => r.agents)) a.work = work?.[a.path] ?? null;
  for (const r of runs) r.agents = r.agents.filter((a) => !a.stale || a.work?.procs);   // a finished agent's worktree, unless work runs in it
  for (const r of runs) r.leadWork = work?.[r.project] ?? null;
  const listed = dir ? [] : (remotes ?? remotesOf(remotesFile(env)));
  const far = remotesReport<OrderStatus>(listed, ask ?? sshAsk(env));
  // with other machines listed, every run says where it runs, this machine's own too; alone, no names
  const name = listed.length ? (here ?? machineName(remotesFile(env), platform)) : null;
  const mine = name ? runs.map((r) => ({ ...r, host: name })) : runs;
  return { updated: new Date(nowMs).toISOString(), dir, runs: [...mine, ...far.runs], unreachable: far.unreachable, notes };
}
