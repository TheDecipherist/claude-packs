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
import { readText } from './files.mjs';
import { readJson } from './json.mjs';
import { commitsAhead, mergedInto, processesOf, runningOrders, workIn, worktreesOf } from './run-discovery.mjs';
import { percent, progressOf, stepsOf } from './run-progress.mjs';
import { machineName, remotesFile, remotesOf, remotesReport, sshAsk } from './run-remotes.mjs';
import { claudeHome, transcriptBeats } from './run-transcripts.mjs';
export { barCells, percent, percentLabel, progressOf, stepsOf } from './run-progress.mjs';
export { SYMBOLS, actionOf, checkedText, workLine } from './run-live.mjs';
export { projectOf, runRows } from './run-rows.mjs';
const LIVE_MS = 60 * 60_000; // a worktree whose heartbeat is younger than this is a live agent, file or not
const KIN_MS = 2 * 60 * 60_000; // an agent branch merged back and untouched this long is a finished agent
function derivedSteps(project, order, trees) {
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
function agentsAhead(steps, agents) {
    return agents.reduce((n, a) => {
        if (a.percent === null)
            return n;
        const owned = steps.filter((s) => s.agent === a.name);
        const items = owned.reduce((m, s) => m + s.items, 0);
        const counted = owned.reduce((m, s) => m + s.done, 0);
        return n + Math.max(0, Math.round((items * a.percent) / 100) - counted);
    }, 0);
}
/** One order's progress: { project, order, steps, agents, items, done, percent, source, finished }. */
export function orderStatus(project, order, { env, nowMs = Date.now() }) {
    const folder = join(project, 'docs', 'workorders', order);
    const trees = worktreesOf(project, env);
    const status = readJson(join(folder, 'status.json')); // the run's file: a broken one is no file, never a crash
    const ownSteps = Array.isArray(status?.steps) ? status.steps : [];
    const fromRun = ownSteps.length > 0;
    const steps = fromRun
        ? ownSteps.map((s) => ({ id: s.id, title: s.title ?? '', items: s.items || 1, done: Math.min(s.done ?? 0, s.items || 1), agent: s.agent ?? null }))
        : derivedSteps(project, order, trees);
    const listed = new Map((Array.isArray(status?.agents) ? status.agents : []).map((a) => [a.name, a]));
    // the heartbeat hook's file, else the agent's last call in Claude Code's own transcripts (an install with no heartbeat yet)
    const fromTranscripts = transcriptBeats(project, { home: claudeHome(env), nowMs });
    const beatOf = (name) => readJson(join(project, '.claude', 'logs', 'heartbeats', `${name}.json`)) ?? fromTranscripts[name] ?? null;
    const alive = (beat) => beat !== null && nowMs - Date.parse(beat.t ?? '') < LIVE_MS;
    // an agent of this order with nothing written yet still counts: its worktree is on the order's own branch, work/<order>-<name>
    // (the user: "I dont see those 5 agents"); one merged back and untouched for KIN_MS is a finished agent, unless work runs in it
    const kin = (branch) => typeof branch === 'string' && branch.startsWith(`work/${order}-`);
    const merged = (branch) => branch !== null && mergedInto(project, branch, `work/${order}`, env);
    const stale = (t) => nowMs - t.touched > KIN_MS && merged(t.branch);
    // its own file says done and its branch is merged: finished, whatever its worktree (KWB-188: 37 finished worktrees listed)
    const finished = (t) => (t.file?.state === 'done' || (t.file?.items !== undefined && (t.file.done ?? 0) >= t.file.items)) && merged(t.branch);
    const agents = trees.map((t) => ({ ...t, file: readJson(join(t.path, 'docs', 'workorders', order, 'agents', `${t.name}.json`)), beat: beatOf(t.name) }))
        .map((t) => { const known = Boolean(t.file || listed.has(t.name) || alive(t.beat)); return { ...t, known, kinOnly: !known && kin(t.branch) }; })
        .filter((t) => t.known || t.kinOnly)
        .map((t) => ({ ...t, stale: (t.kinOnly && stale(t)) || finished(t), fresh: t.kinOnly && t.branch !== null && commitsAhead(project, t.branch, `work/${order}`, env) === 0 })) // runsReport drops a stale one unless work runs in it
        .map((t) => {
        const f = t.file ?? {};
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
function ordersIn(project, only) {
    if (only)
        return [only];
    try {
        return readdirSync(join(project, 'docs', 'workorders'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    }
    catch {
        return [];
    }
}
/** Every run's progress: the runs alive on this machine and on every machine remotes.json lists (1.8.1), or one project's
 *  orders here (`dir`); what could not be looked at is said, never silence. */
export function runsReport({ env, platform, dir = null, order = null, remotes, ask, here, nowMs = Date.now() }) {
    const notes = []; // what could not be looked at (KWB-161: Windows' sessions)
    const found = dir ? ordersIn(dir, order).map((o) => ({ project: dir, order: o })) : runningOrders({ env, platform, notes, nowMs });
    const runs = found.map((r) => orderStatus(r.project, r.order, { env, nowMs }));
    // the check: what really runs in each agent's worktree now, and in the checkout the lead works in (the user: "and what
    // happened to the heartbeat and cores and all that?"); a process counts for the deepest folder, so an agent's build is its own
    const work = workIn([...runs.map((r) => r.project), ...runs.flatMap((r) => r.agents.map((a) => a.path))], processesOf(env));
    for (const a of runs.flatMap((r) => r.agents))
        a.work = work?.[a.path] ?? null;
    for (const r of runs)
        r.agents = r.agents.filter((a) => !a.stale || a.work?.procs); // a finished agent's worktree, unless work runs in it
    for (const r of runs)
        r.leadWork = work?.[r.project] ?? null;
    const listed = dir ? [] : (remotes ?? remotesOf(remotesFile(env)));
    const far = remotesReport(listed, ask ?? sshAsk(env));
    // with other machines listed, every run says where it runs, this machine's own too; alone, no names
    const name = listed.length ? (here ?? machineName(remotesFile(env), platform)) : null;
    const mine = name ? runs.map((r) => ({ ...r, host: name })) : runs;
    return { updated: new Date(nowMs).toISOString(), dir, runs: [...mine, ...far.runs], unreachable: far.unreachable, notes };
}
