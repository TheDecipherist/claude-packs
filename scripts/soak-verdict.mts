// The soak's comparison of two answers to one event (typescript order W10b, KWB-216): the daemon's and the TypeScript runner's. Only the
// governor's machine figures and an empty `{}` are left out. A "not judged by X (over time)" line is NOT left out: it marks a verdict made
// without a judge, which the daemon must never give (it hands the whole event to the TypeScript path instead), so it is a difference.
import { toJson } from '../packs/base/hooks/lib/json.mts';

export interface Answer { code: number | null; out: string; err: string; ms: number }

const NOT_JUDGED = 'not judged by';
const GOVERNOR_FIGURES = /\d+(\.\d+)?/g;

/** The answer as compared: the exit code, the hooks that spoke and what they said (the governor's refusals, which print the machine's
 *  load and slot counts at that moment, without those figures). */
export const verdictOf = (a: Answer): { code: number | null; out: string; err: string } => ({
  code: a.code,
  out: a.out.replace(/^\{\}$/, '').trim(),
  err: a.err.includes('governor-route') ? a.err.replace(GOVERNOR_FIGURES, '#') : a.err,
});

/** A partial verdict: the answer says some judge did not judge. */
export const isPartial = (a: Answer): boolean => a.out.includes(NOT_JUDGED);

/** The same verdict, and not a partial one from the daemon. */
export const sameVerdict = (daemon: Answer, ts: Answer): boolean => !isPartial(daemon) && toJson(verdictOf(daemon)) === toJson(verdictOf(ts));
