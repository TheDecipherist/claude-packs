// resident/state: the daemon's pid file, the one file `claude-packs daemon status|stop` and run-discovery read (review-2-go 3.8, 3.10).
// It is written by the main thread only, by rename (writeJson), at start, at most every two seconds while events are served, and at
// stop. `events` counts the hook events served (status-line asks are not events).
import { rmSync } from 'node:fs';
import { readJson, writeJson } from '../lib/json.mjs';
export const STATE_EVERY_MS = 2000;
export function stateFile(file, everyMs = STATE_EVERY_MS) {
    let last = 0;
    return {
        save: (now, force = false) => {
            if (!force && Date.now() - last < everyMs)
                return;
            last = Date.now();
            writeJson(file, now);
        },
        remove: () => { rmSync(file, { force: true }); },
    };
}
const isState = (v) => typeof v === 'object' && v !== null && typeof v.pid === 'number' && typeof v.key === 'string';
/** The pid file at `file`, or null when there is none or it is not one. */
export function readState(file) {
    const state = readJson(file);
    return isState(state) ? state : null;
}
