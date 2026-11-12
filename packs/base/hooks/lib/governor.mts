// The load governor (typescript order W8.8, the user 2026-11-12: "something that controls load in the kit that everything 'runs
// through' so you can never max out a machine ... you or agents ask before they start. how much can I use and it simply gets a straight
// answer based on current load"). The one owner of "how many cores may this job use now", shared by every session, agent and project
// on the machine: the budget (slots, 60 % of the cores by default) and the load ceiling (70 %), the jobs in flight and the waiting
// queue (governor-store.mts), and what a granted job is started with (governor-settings.mts). Everything heavy asks here: `load ask`,
// buildq, `governed` and the routing hook; the watchdog pauses the newest job when the load stays over the ceiling.
//   machineHost(env) -> the real machine     budgetOf(host, project) -> { cores, slots, ceiling }
//   ask(host, request) -> Answer             take(host, request) -> { ok, grant } | { ok: false, answer }
//   free(host, id) -> bool                   inFlight(host) -> { jobs, waiting }
//   queueUp(host, request) -> waiter id      leaveQueue(host, id)          setPaused(host, id, at | null)
import { randomBytes } from 'node:crypto';
import { availableParallelism, homedir, loadavg } from 'node:os';
import { join } from 'node:path';
import { alive } from './daemon-find.mts';
import { isRecord, readJson } from './json.mts';
import { changeState, governorDir, liveState } from './governor-store.mts';
import type { GovernorState, Job, JobKind } from './governor-store.mts';
import { settingsFor } from './governor-settings.mts';
import type { JobSettings } from './governor-settings.mts';
import type { Env } from './types.d.mts';

export type { GovernorState, Job, JobKind, Waiter } from './governor-store.mts';
export type { JobSettings } from './governor-settings.mts';

/** The budget's default share of the cores, and the load ceiling's. */
export const BUDGET_SHARE = 0.6;
export const CEILING_SHARE = 0.7;
/** What a take with no `--want` asks for, by kind: the order's per-job sizes (a test run at 3, a fuzzer at 2 workers and its
 *  coordinator, an agent's own process 1). A build asks for its share through buildq's own budget instead. */
export const DEFAULT_WANT: Readonly<Record<JobKind, number>> = { test: 3, build: 4, fuzz: 3, agent: 1, install: 2, other: 2 };

/** Everything the governor knows of the machine, passed in so a test plants it: the environment (the folders), the home folder,
 *  the cores, the 1-minute load, the clock and whether a pid is alive. */
export interface GovernorHost {
  env: Env;
  home: string;
  cores: number;
  load: () => number;
  now: () => number;
  alive: (pid: number) => boolean;
}

/** The machine this process runs on. CLAUDE_PACKS_GOVERNOR_CORES and CLAUDE_PACKS_GOVERNOR_LOAD plant the cores and the load for a
 *  test (the load W8.7's sampler sees is the same kernel number, `vm.loadavg`, so this reads it directly). */
export function machineHost(env: Env = process.env): GovernorHost {
  const plantedCores = Number(env['CLAUDE_PACKS_GOVERNOR_CORES']);
  const plantedLoad = env['CLAUDE_PACKS_GOVERNOR_LOAD'];
  return {
    env,
    home: env['HOME'] || homedir(),
    cores: plantedCores >= 1 ? Math.floor(plantedCores) : availableParallelism(),
    load: () => (plantedLoad !== undefined && plantedLoad !== '' ? Number(plantedLoad) : loadavg()[0] ?? 0),
    now: Date.now,
    alive,
  };
}

/** The machine's budget: `cores`, the `slots` jobs may hold together and the 1-minute load `ceiling`. */
export interface Budget { cores: number; slots: number; ceiling: number }

/** `~/.config/claude-packs/governor.json` (XDG_CONFIG_HOME): `{ "budget": 0.6 | 8, "ceiling": 0.7 | 12 }`. */
export const governorConfig = (env: Env, home: string): string =>
  join(env['XDG_CONFIG_HOME'] || join(home, '.config'), 'claude-packs', 'governor.json');

/** A setting as cores: a share under 1 (0.6), a count from 1 (8), a percentage ("60%"); null when it is none of them. */
export function coresOf(value: unknown, cores: number): number | null {
  const text = typeof value === 'string' ? value.trim() : '';
  const pct = text.endsWith('%') ? Number(text.slice(0, -1)) / 100 : null;
  const n = pct ?? (typeof value === 'number' ? value : text === '' ? NaN : Number(text));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1 || pct !== null ? n * cores : n;
}

/** The project's own cap, `.claude/layout.json` "guards": { "governor": { "budget": ... } }: it may lower the budget, never raise it. */
function projectCap(project: string | undefined, cores: number): number | null {
  if (!project) return null;
  const layout = readJson<unknown>(join(project, '.claude', 'layout.json'));
  const guards = isRecord(layout) ? layout['guards'] : null;
  const governor = isRecord(guards) ? guards['governor'] : null;
  return isRecord(governor) ? coresOf(governor['budget'], cores) : null;
}

/** The budget: the machine's file, else 60 % of the cores for slots (at least 1) and 70 % for the ceiling, lowered by the project. */
export function budgetOf(host: GovernorHost, project?: string): Budget {
  const file = readJson<unknown>(governorConfig(host.env, host.home));
  const config = isRecord(file) ? file : {};
  const machine = coresOf(config['budget'], host.cores) ?? host.cores * BUDGET_SHARE;
  const cap = projectCap(project, host.cores);
  const slots = Math.max(1, Math.min(host.cores, Math.floor(cap === null ? machine : Math.min(machine, cap))));
  const ceiling = Math.max(1, Math.round(coresOf(config['ceiling'], host.cores) ?? host.cores * CEILING_SHARE));
  return { cores: host.cores, slots, ceiling };
}

/** What a caller asks about: the kind of job, how many slots it wants whole (`want`), or, with none, as many as are free up to `upTo`
 *  (its kind's DEFAULT_WANT when not given), its project and its pid. */
export interface Request { kind?: JobKind; want?: number; project?: string; pid?: number; upTo?: number }

/** The straight answer: whether the job may start now (`go`), the cores free now, what a take would be granted and its settings,
 *  and the numbers behind it; `line` is the sentence `load ask` prints. */
export interface Answer {
  go: boolean;
  kind: JobKind;
  free: number;
  grant: number;
  settings: JobSettings;
  load: number;
  budget: Budget;
  used: number;
  running: number;
  queued: number;
  paused: number;
  line: string;
}

const round1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The answer for `request` on `state` (read under the lock by take, without it by ask). `ticket`: the caller's place in the queue. */
function answerOn(host: GovernorHost, state: GovernorState, request: Request, ticket: string | null): Answer {
  const kind = request.kind ?? 'other';
  const budget = budgetOf(host, request.project);
  const load = host.load();
  const used = state.jobs.reduce((sum, j) => sum + j.slots, 0);
  const free = Math.max(0, Math.min(budget.slots - used, Math.floor(budget.ceiling - load)));
  const first = state.waiting[0];
  const ahead = first !== undefined && first.id !== ticket;   // first in, first served: a waiter before this caller goes first
  const want = request.want === undefined ? null : Math.max(1, Math.min(Math.floor(request.want), budget.slots));
  const grant = want === null ? Math.min(free, Math.max(1, Math.floor(request.upTo ?? DEFAULT_WANT[kind]))) : want <= free ? want : 0;
  const go = !ahead && grant >= 1;
  const paused = state.jobs.filter((j) => j.pausedAt !== null).length;
  const shown = go && want !== null ? grant : free;   // ask with no want: everything free now; with one: what it would be granted
  const settings = settingsFor(kind, Math.max(1, shown));
  const tail = `load ${round1(load)} of ${budget.cores}, ceiling ${budget.ceiling}, ${plural(state.jobs.length, 'job')} running`;
  let line: string;
  if (go) line = `you may use ${shown} cores now (${settings.words}); ${tail}`;
  else line = `wait: ${waitReason(budget, load, used, free, want, ahead)}; ${plural(free, 'core')} free; ${waitUntil(state.jobs, ahead)}`;
  return { go, kind, free, grant: go ? grant : 0, settings, load, budget, used, running: state.jobs.length, queued: state.waiting.length, paused, line };
}

function waitReason(budget: Budget, load: number, used: number, free: number, want: number | null, ahead: boolean): string {
  if (load >= budget.ceiling) return `load ${round1(load)} over the ceiling ${budget.ceiling}`;
  if (ahead) return 'a job queued before this one goes first';
  if (want !== null && free >= 1) return `${want} wanted, ${free} free (${used} of ${budget.slots} slots in use, load ${round1(load)})`;
  return `${used} of ${budget.slots} slots in use (load ${round1(load)}, ceiling ${budget.ceiling})`;
}

function waitUntil(jobs: readonly Job[], ahead: boolean): string {
  if (ahead) return 'ask again when the queue moves';
  const newest = [...jobs].sort((a, b) => b.start - a.start)[0];
  return newest === undefined ? 'ask again in a minute (the load is not the kit\'s jobs)' : `ask again after the running ${newest.kind} ends`;
}

const dirOf = (host: GovernorHost): string => governorDir(host.env, host.home);
const newId = (prefix: string): string => `${prefix}${randomBytes(4).toString('hex')}`;

/** The straight answer now, read without the lock and without writing. */
export const ask = (host: GovernorHost, request: Request = {}): Answer => answerOn(host, liveState(dirOf(host), host.alive), request, null);

/** The jobs in flight and the waiting queue, the stale ones dropped. */
export const inFlight = (host: GovernorHost): GovernorState => liveState(dirOf(host), host.alive);

/** A granted job: its id (what `free` takes), its slots and the settings to start it with. */
export interface Grant { id: string; kind: JobKind; slots: number; pid: number; settings: JobSettings; line: string }

/** What a take records beside the request: the holder's pid (the grant is freed when it is gone), its process group, the command,
 *  and the caller's queue ticket (queueUp) when it waited for its turn. */
export interface TakeRequest extends Request { pid: number; pgid?: number | null; command?: string; ticket?: string | null }

export type TakeResult = { ok: true; grant: Grant } | { ok: false; answer: Answer };

/** Reserves slots under the lock: a want is granted whole or refused (the caller waits); no want takes what is free up to its kind's
 *  default. A granted ticket leaves the queue in the same write. */
export function take(host: GovernorHost, request: TakeRequest): TakeResult {
  return changeState(dirOf(host), host.alive, (state): TakeResult => {
    const answer = answerOn(host, state, request, request.ticket ?? null);
    if (!answer.go) return { ok: false, answer };
    const id = newId('g');
    state.jobs.push({ id, pid: request.pid, pgid: request.pgid ?? null, kind: answer.kind, slots: answer.grant, project: request.project ?? '',
      start: host.now(), pausedAt: null, command: request.command ?? '' });
    state.waiting = state.waiting.filter((w) => w.id !== request.ticket);
    const settings = settingsFor(answer.kind, answer.grant);
    const line = `granted ${id}: ${answer.grant} cores (${settings.words}); free it with \`load free ${id}\` (freed by itself when pid ${request.pid} ends)`;
    return { ok: true, grant: { id, kind: answer.kind, slots: answer.grant, pid: request.pid, settings, line } };
  });
}

/** Returns a grant's slots (or drops a queue ticket); false when no such id is held. */
export function free(host: GovernorHost, id: string): boolean {
  return changeState(dirOf(host), host.alive, (state) => {
    const before = state.jobs.length + state.waiting.length;
    state.jobs = state.jobs.filter((j) => j.id !== id);
    state.waiting = state.waiting.filter((w) => w.id !== id);
    return state.jobs.length + state.waiting.length < before;
  });
}

/** Puts a job that must wait at the back of the queue (so the status line counts it and later takes do not pass it); its ticket. */
export function queueUp(host: GovernorHost, request: Request & { pid: number }): string {
  return changeState(dirOf(host), host.alive, (state) => {
    const id = newId('w');
    state.waiting.push({ id, pid: request.pid, kind: request.kind ?? 'other', want: request.want ?? DEFAULT_WANT[request.kind ?? 'other'],
      project: request.project ?? '', since: host.now() });
    return id;
  });
}

/** Leaves the queue without a grant (the job gave up). */
export const leaveQueue = (host: GovernorHost, ticket: string): boolean => free(host, ticket);

/** Marks a job paused at `at` (the watchdog stopped its group) or running again (null); false when no such job is held. */
export function setPaused(host: GovernorHost, id: string, at: number | null): boolean {
  return changeState(dirOf(host), host.alive, (state) => {
    const job = state.jobs.find((j) => j.id === id);
    if (job === undefined) return false;
    job.pausedAt = at;
    return true;
  });
}
