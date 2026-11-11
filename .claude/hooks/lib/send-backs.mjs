// The send-back counter of making-check: three send-backs with the same findings end the turn, and the findings go to the user
// instead of looping. The count is state kept per session in the temp folder. making-check (a judge) only reads it through
// `endsTheTurn`; making-check-count (the recorder) is the one that writes it through `recordSendBack` (typescript W4: a hook that
// judges and records is split in two).
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { put } from './files.mjs';
import { readJson, toJson } from './json.mjs';
export const MAX_SENDS = 3;
/** The file one session's count is kept in, under the caller's temp folder (`TMPDIR`) or the system's. */
export const sendBackFile = (env, session) => join(env['TMPDIR'] ?? tmpdir(), `making-check-${String(session ?? 'session').replace(/[^\w-]/g, '')}.json`);
const hashOf = (problems) => createHash('sha1').update(problems.join('\n')).digest('hex');
/** The count after this stop: consecutive stops with the same findings count whether or not the host marks them as a continuation
 *  (stop_hook_active): a host that delivers each send-back as a new turn reset the count to 1 every time, and the limit was never
 *  reached (KWB-7). No findings: 0. */
export function countAfter(kept, problems) {
    if (!problems.length)
        return 0;
    return kept?.hash === hashOf(problems) && typeof kept.count === 'number' ? kept.count + 1 : 1;
}
/** True when this stop is past the limit: the turn ends here and the findings go to the user. Reads the counter, writes nothing. */
export const endsTheTurn = (file, problems) => countAfter(readJson(file), problems) > MAX_SENDS;
/** The recorder's write: the session's counter after this stop. */
export function recordSendBack(file, problems) {
    const count = countAfter(readJson(file), problems);
    try {
        put(file, toJson({ hash: hashOf(problems), count }));
    }
    catch { /* the check still runs */ }
}
