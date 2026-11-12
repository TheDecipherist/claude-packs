// The load governor (typescript order W8.8, the user 2026-11-12: "something that controls load in the kit that everything 'runs
// through' so you can never max out a machine ... you or agents ask before they start. how much can I use and it simply gets a straight
// answer based on current load"). The one owner of "how many cores may this job use now", shared by every session, agent and project
// on the machine. Its parts: the budget and the machine (governor-budget.mts), the answer with priorities (governor-policy.mts), the
// jobs in flight and the waiting queue (governor-store.mts), what a granted job is started with (governor-settings.mts). Everything
// heavy asks here: `load ask`, buildq, `governed` and the routing hook; the watchdog pauses by `pauseOrder`.
//   machineHost(env) -> the real machine     budgetOf(host, project) -> { cores, slots, ceiling }
//   ask(host, request) -> Answer             take(host, request) -> { ok, grant } | { ok: false, answer }
//   free(host, id) -> bool                   inFlight(host) -> { jobs, waiting }
//   queueUp(host, request) -> waiter id      leaveQueue(host, id)          setPaused(host, id, at | null)
//   pauseOrder(jobs) -> the running jobs, the first to pause first         resumeOrder(jobs) -> the paused, the first to resume first
//   adopt(host, id, pgid): the process group a granted job runs in
//   grantWhenFree(host, request, onWait) -> the grant, once the queue reaches it (buildq and governed wait this way)
//   grantWithin(host, request, giveUpMs, onWait) -> the grant, or null when it did not come in time (an agent's start)
import { randomBytes } from 'node:crypto';
import { DEFAULT_WANT, type GovernorHost } from './governor-budget.mts';
import { answerOn, priorityOf, type Answer, type Request } from './governor-policy.mts';
import { changeState, governorDir, liveState, napSync } from './governor-store.mts';
import type { GovernorState, JobKind } from './governor-store.mts';
import { settingsFor } from './governor-settings.mts';
import type { JobSettings } from './governor-settings.mts';

export type { GovernorState, Job, JobKind, Waiter } from './governor-store.mts';
export type { JobSettings } from './governor-settings.mts';
export { BUDGET_SHARE, CEILING_SHARE, DEFAULT_WANT, HARD_SHARE, budgetOf, coresOf, governorConfig, machineHost } from './governor-budget.mts';
export type { Budget, GovernorHost } from './governor-budget.mts';
export { AGING_EVERY_MS, AGING_STEP, agedPriority, pauseOrder, priorityCap, resumeOrder } from './governor-policy.mts';
export type { Answer, Request } from './governor-policy.mts';
export { DEFAULT_PRIORITY } from './governor-store.mts';

const dirOf = (host: GovernorHost): string => governorDir(host.env, host.home);
const newId = (prefix: string): string => `${prefix}${randomBytes(4).toString('hex')}`;

/** The straight answer now, read without the lock and without writing. */
export const ask = (host: GovernorHost, request: Request = {}): Answer => answerOn(host, liveState(dirOf(host), host.alive), request, null);

/** The jobs in flight and the waiting queue, the stale ones dropped. */
export const inFlight = (host: GovernorHost): GovernorState => liveState(dirOf(host), host.alive);

/** A granted job: its id (what `free` takes), its slots, the priority it was granted at and the settings to start it with. */
export interface Grant { id: string; kind: JobKind; slots: number; priority: number; pid: number; settings: JobSettings; line: string }

/** What a take records beside the request: the holder's pid (the grant is freed when it is gone), its process group, the command,
 *  and the caller's queue ticket (queueUp) when it waited for its turn. */
export interface TakeRequest extends Request { pid: number; pgid?: number | null; command?: string; ticket?: string | null }

export type TakeResult = { ok: true; grant: Grant } | { ok: false; answer: Answer };

/** Reserves slots under the lock: a want (cut to the priority's share) is granted whole or refused (the caller waits); no want takes
 *  what is free up to the priority's share and the kind's size. A granted ticket leaves the queue in the same write. */
export function take(host: GovernorHost, request: TakeRequest): TakeResult {
  return changeState(dirOf(host), host.alive, (state): TakeResult => {
    const answer = answerOn(host, state, request, request.ticket ?? null);
    if (!answer.go) return { ok: false, answer };
    const id = newId('g');
    state.jobs.push({ id, pid: request.pid, pgid: request.pgid ?? null, kind: answer.kind, slots: answer.grant, priority: answer.priority,
      project: request.project ?? '', start: host.now(), pausedAt: null, command: request.command ?? '' });
    state.waiting = state.waiting.filter((w) => w.id !== request.ticket);
    const settings = settingsFor(answer.kind, answer.grant);
    const line = `granted ${id}: ${answer.grant} cores at priority ${answer.priority} (${settings.words}); free it with \`load free ${id}\``
      + ` (freed by itself when pid ${request.pid} ends)`;
    return { ok: true, grant: { id, kind: answer.kind, slots: answer.grant, priority: answer.priority, pid: request.pid, settings, line } };
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

/** Puts a job that must wait in the queue (so the status line counts it, and later asks of lower priority do not pass it); its ticket.
 *  It is served by its priority, which rises the longer it waits (agedPriority). */
export function queueUp(host: GovernorHost, request: Request & { pid: number }): string {
  return changeState(dirOf(host), host.alive, (state) => {
    const id = newId('w');
    const kind = request.kind ?? 'other';
    state.waiting.push({ id, pid: request.pid, kind, want: request.want ?? request.upTo ?? DEFAULT_WANT[kind], priority: priorityOf(request),
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

/** Records the process group a granted job was started in (`governed` starts it after the take), so the watchdog can pause it;
 *  false when no such job is held. */
export function adopt(host: GovernorHost, id: string, pgid: number): boolean {
  return changeState(dirOf(host), host.alive, (state) => {
    const job = state.jobs.find((j) => j.id === id);
    if (job === undefined) return false;
    job.pgid = pgid;
    return true;
  });
}

/** How often a waiting job asks again. */
export const ASK_AGAIN_MS = 500;

/** Takes, and when refused waits in the queue (one ticket, so the status line counts it and its priority ages) asking again every
 *  ASK_AGAIN_MS until granted or `giveUpMs` has passed (then it leaves the queue: null). `onWait` hears each refusal with how long the
 *  job has waited. The waiter is the request's pid: a waiter killed while it waits leaves a ticket the next read drops. */
export function grantWithin(host: GovernorHost, request: TakeRequest, giveUpMs: number, onWait: (answer: Answer, waitedMs: number) => void = () => undefined): Grant | null {
  const began = host.now();
  let ticket: string | null = null;
  for (let r = take(host, request); ; r = take(host, { ...request, ticket })) {
    if (r.ok) return r.grant;
    ticket ??= queueUp(host, request);
    const waited = host.now() - began;
    if (waited >= giveUpMs) { leaveQueue(host, ticket); return null; }
    onWait(r.answer, waited);
    napSync(Math.min(ASK_AGAIN_MS, Math.max(1, giveUpMs - waited)));
  }
}

/** The same, waiting as long as it takes (buildq and governed). */
export function grantWhenFree(host: GovernorHost, request: TakeRequest, onWait?: (answer: Answer, waitedMs: number) => void): Grant {
  const grant = grantWithin(host, request, Infinity, onWait);
  if (grant === null) throw new Error('governor: a wait with no end gave up');
  return grant;
}
