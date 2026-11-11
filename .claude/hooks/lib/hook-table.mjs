// hook-table: the table an install generates from the packs' pack.json hook rows (.claude/hooks/hooks.json, typescript order W8.1,
// d-9). settings.json holds one blocking entry per event, whose matcher is the union of its hooks' matchers; the runner reads this
// table and decides for itself which hooks the event reaches: the event's name, the matcher against the tool (or the session
// source), the rows in `order`. The install writes it (lib/hook-table.mjs), the runner, the resident runner, hook-proof and
// doctor's coverage read it. A matcher is Claude Code's: a plain list of names (`Write|Edit|Bash`) is matched whole, anything else
// is a regular expression; none, empty or `*` matches everything.
import { join } from 'node:path';
import { readText } from './files.mjs';
import { parseJson } from './json.mjs';
export const TABLE_FILE = 'hooks.json';
const PLAIN = /^[\w|]+$/;
/** Whether a matcher takes everything: none, empty, or `*`. */
export const matchesAll = (matcher) => matcher === undefined || matcher === '' || matcher === '*';
/** What an event's matcher is read against: the tool of a tool event, the source of a SessionStart; nothing for the others. */
export function matcherSubjectOf(event) {
    const name = event.hook_event_name;
    if (name === 'PreToolUse' || name === 'PostToolUse')
        return event.tool_name;
    if (name === 'SessionStart')
        return event.source;
    return undefined;
}
/** Whether a matcher reaches a subject (a subject-less event is reached by a hook with no matcher only). */
export function matcherReaches(matcher, subject) {
    if (matchesAll(matcher))
        return true;
    if (subject === undefined || matcher === undefined)
        return false;
    if (PLAIN.test(matcher))
        return matcher.split('|').includes(subject);
    try {
        return new RegExp(matcher).test(subject);
    }
    catch {
        return false;
    }
}
/** The union of several matchers as one: none when any takes everything, else the plain names joined, or the expressions grouped. */
export function unionMatcher(matchers) {
    if (matchers.some(matchesAll))
        return undefined;
    const all = matchers.filter((m) => m !== undefined);
    if (all.every((m) => PLAIN.test(m)))
        return [...new Set(all.flatMap((m) => m.split('|')))].join('|');
    return [...new Set(all)].map((m) => (PLAIN.test(m) ? m : `(?:${m})`)).join('|');
}
const isRow = (row) => typeof row === 'object' && row !== null && typeof row.hook === 'string' && Array.isArray(row.events);
/** The table in a hooks folder, or null when it holds none (or it is not a table). */
export function readHookTable(hooksDir) {
    const rows = parseJson(readText(join(hooksDir, TABLE_FILE)));
    return Array.isArray(rows) && rows.every(isRow) ? rows : null;
}
/** The rows an event runs, in `order` (a row with none after the numbered ones, in table order); a hook once, at its first row. The
 *  `async` and `asyncRewake` rows are never in it: those hooks keep their own settings entries. */
export function hookRowsFor(table, event) {
    const subject = matcherSubjectOf(event);
    const reached = table.filter((r) => !r.async && !r.asyncRewake && r.events.some((e) => e === event.hook_event_name) && matcherReaches(r.matcher, subject));
    const seen = new Set();
    const once = reached.filter((r) => (seen.has(r.hook) ? false : (seen.add(r.hook), true)));
    const rank = (r) => r.order ?? Number.POSITIVE_INFINITY;
    return once.map((r, n) => ({ r, n })).sort((a, b) => (rank(a.r) === rank(b.r) ? 0 : rank(a.r) - rank(b.r)) || a.n - b.n).map(({ r }) => r);
}
