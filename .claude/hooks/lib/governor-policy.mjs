// The load governor's answer (typescript order W8.8 items 0 and 0b): how many cores a job may use now, from the budget, the live load,
// the jobs in flight and the queue, by priority (the user, 2026-11-12: "if it says something like I am priority 0.3 then it can get max
// 3 cores ... it should be prioritized by what work is required before other things"). A priority P (0 to 1, default 0.5) is the most
// of the budget the job may hold (at least 1 core, so none starves); waiting jobs are served highest priority first, each one's share
// held for it before a lower one is granted; a waiting job's priority rises 0.1 every 5 minutes; the watchdog pauses the lowest first.
//   answerOn(host, state, request, ticket) -> Answer     agedPriority(p, since, now)     priorityCap(p, slots)
//   pauseOrder(jobs) / resumeOrder(jobs) -> the order the watchdog pauses and resumes in
import { DEFAULT_WANT, budgetOf } from './governor-budget.mjs';
import { DEFAULT_PRIORITY } from './governor-store.mjs';
import { settingsFor } from './governor-settings.mjs';
/** A waiting job's priority rises this much for every AGING_EVERY_MS it waits. */
export const AGING_STEP = 0.1;
export const AGING_EVERY_MS = 5 * 60_000;
/** Float slack so 0.3 of 10 is 3 cores, not 2. */
const EPSILON = 1e-9;
const HUNDREDTHS = 100;
const hundredths = (n) => Math.round(n * HUNDREDTHS) / HUNDREDTHS;
const clampShare = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : DEFAULT_PRIORITY);
/** The priority a request names, held to 0..1 (DEFAULT_PRIORITY when it names none). */
export const priorityOf = (request) => hundredths(clampShare(request.priority ?? DEFAULT_PRIORITY));
/** A priority after waiting since `since`: AGING_STEP more for every AGING_EVERY_MS, never over 1. */
export const agedPriority = (priority, since, now) => hundredths(Math.min(1, priority + AGING_STEP * Math.floor(Math.max(0, now - since) / AGING_EVERY_MS)));
/** The most of `slots` a job of `priority` may hold: its share, at least 1. */
export const priorityCap = (priority, slots) => Math.max(1, Math.min(slots, Math.floor(priority * slots + EPSILON)));
/** The running jobs in the order the watchdog pauses them: the lowest priority first, the newest first among equals. */
export const pauseOrder = (jobs) => jobs.filter((j) => j.pausedAt === null).sort((a, b) => a.priority - b.priority || b.start - a.start);
/** The paused jobs in the order the watchdog resumes them: the highest priority first, the longest paused first among equals. */
export const resumeOrder = (jobs) => jobs.filter((j) => j.pausedAt !== null).sort((a, b) => b.priority - a.priority || (a.pausedAt ?? 0) - (b.pausedAt ?? 0));
function queuePlace(waiting, request, ticket, now) {
    const mine = waiting.find((w) => w.id === ticket);
    return mine ? { priority: agedPriority(mine.priority, mine.since, now), since: mine.since } : { priority: priorityOf(request), since: now };
}
/** The cores left for the caller once every job queued ahead of it (a higher aged priority, or as high and waiting longer) has its
 *  share held for it. */
function leftAfter(free, waiting, me, ticket, slots, now) {
    const ahead = waiting.filter((w) => {
        if (w.id === ticket)
            return false;
        const p = agedPriority(w.priority, w.since, now);
        return p > me.priority || (p === me.priority && w.since < me.since);
    });
    const held = ahead.reduce((sum, w) => sum + Math.min(w.want, priorityCap(agedPriority(w.priority, w.since, now), slots)), 0);
    return { left: Math.max(0, free - held), ahead: ahead.length };
}
const round1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
/** The answer for `request` on `state` (read under the lock by take, without it by ask). `ticket`: the caller's place in the queue. */
export function answerOn(host, state, request, ticket) {
    const kind = request.kind ?? 'other';
    const budget = budgetOf(host, request.project);
    const load = host.load();
    const now = host.now();
    const used = state.jobs.reduce((sum, j) => sum + j.slots, 0);
    const free = Math.max(0, Math.min(budget.slots - used, Math.floor(budget.ceiling - load)));
    const me = queuePlace(state.waiting, request, ticket, now);
    const cap = priorityCap(me.priority, budget.slots);
    const { left, ahead } = leftAfter(free, state.waiting, me, ticket, budget.slots, now);
    const want = request.want === undefined ? null : Math.max(1, Math.min(Math.floor(request.want), cap));
    const grant = want === null ? Math.min(left, cap, Math.max(1, Math.floor(request.upTo ?? DEFAULT_WANT[kind]))) : want <= left ? want : 0;
    const go = grant >= 1;
    // ask with no want: everything this priority may use now; with one: what it would be granted
    const shown = go && want !== null ? grant : Math.min(left, cap);
    const settings = settingsFor(kind, Math.max(1, shown));
    const tail = `load ${round1(load)} of ${budget.cores}, ceiling ${budget.ceiling}, ${plural(state.jobs.length, 'job')} running; priority ${me.priority}`;
    const line = go
        ? `you may use ${shown} cores now (${settings.words}); ${tail}`
        : `wait: ${waitReason({ budget, load, used, free, want, ahead, left })}; ${plural(left, 'core')} free; ${waitUntil(state.jobs, ahead)}; priority ${me.priority}`;
    const paused = state.jobs.filter((j) => j.pausedAt !== null).length;
    return { go, kind, priority: me.priority, free, grant: go ? grant : 0, settings, load, budget, used, running: state.jobs.length,
        queued: state.waiting.length, paused, line };
}
function waitReason({ budget, load, used, free, want, ahead, left }) {
    if (load >= budget.ceiling)
        return `load ${round1(load)} over the ceiling ${budget.ceiling}`;
    if (ahead > 0 && left < free)
        return `${plural(ahead, 'job')} of higher priority queued first`;
    if (want !== null && free >= 1)
        return `${want} wanted, ${free} free (${used} of ${budget.slots} slots in use, load ${round1(load)})`;
    return `${used} of ${budget.slots} slots in use (load ${round1(load)}, ceiling ${budget.ceiling})`;
}
function waitUntil(jobs, ahead) {
    if (ahead > 0)
        return 'ask again when the queue moves';
    const newest = [...jobs].sort((a, b) => b.start - a.start)[0];
    return newest === undefined ? 'ask again in a minute (the load is not the kit\'s jobs)' : `ask again after the running ${newest.kind} ends`;
}
