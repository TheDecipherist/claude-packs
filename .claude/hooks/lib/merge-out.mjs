// merge-out: what the runner does with the stdout of the hooks of one event: one is passed as it is, JSON objects are merged
// (their messages joined), anything else is joined by lines; the merged text is held to OUT_CAP (Claude Code cuts a hook's output at
// 10,000 characters), with a line saying what was cut. Split from run-hooks.mts (W8.1) so the runner stays within the file limit.
import { parseJson, toJson } from './json.mjs';
/** What the merged text of one event may hold: Claude Code cuts a hook's output at 10,000 characters. */
export const OUT_CAP = 9000;
/** A value as an object, or null when it is an array, a scalar or nothing. */
export const asRecord = (value) => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null);
const cutNote = (n) => `\n[run-hooks: ${n} characters of the hooks' output were cut here; Claude Code cuts a hook's output at 10,000]\n`;
// The text of the longest string field a merged JSON object carries, found where hooks put their words.
function wordiest(obj) {
    const holders = [];
    for (const k of ['systemMessage', 'reason', 'stopReason']) {
        if (typeof obj[k] === 'string')
            holders.push({ get: () => String(obj[k]), set: (s) => { obj[k] = s; } });
    }
    const spec = asRecord(obj.hookSpecificOutput);
    if (spec && typeof spec.additionalContext === 'string')
        holders.push({ get: () => String(spec.additionalContext), set: (s) => { spec.additionalContext = s; } });
    return holders.sort((a, b) => b.get().length - a.get().length)[0] ?? null;
}
/** The merged text held to OUT_CAP: plain text is cut at the end; a JSON object has its wordiest message cut, so it still parses. */
export function capOut(text) {
    if (text.length <= OUT_CAP)
        return text;
    const obj = asRecord(parseJson(text));
    const holder = obj ? wordiest(obj) : null;
    if (obj && holder) {
        const whole = holder.get();
        let kept = whole.length;
        while (kept > 0) {
            kept = Math.max(0, kept - Math.max(1, toJson(obj).length - OUT_CAP + cutNote(whole.length).length));
            holder.set(whole.slice(0, kept) + cutNote(whole.length - kept));
            if (toJson(obj).length <= OUT_CAP)
                return toJson(obj);
        }
    }
    const keep = OUT_CAP - cutNote(text.length).length;
    return text.slice(0, keep) + cutNote(text.length - keep);
}
// Several hooks' stdout: one is passed as it is; JSON objects are merged (their messages joined), anything else joined by lines.
export function mergeOut(outs) {
    const said = outs.filter((o) => o.trim());
    if (said.length < 2)
        return capOut(said[0] ?? '');
    const objs = said.map((o) => asRecord(parseJson(o)));
    const plain = objs.some((o) => o === null);
    if (plain)
        return capOut(said.map((o) => o.replace(/\n$/, '')).join('\n') + '\n');
    const out = {};
    for (const o of objs) {
        for (const [k, v] of Object.entries(o ?? {})) {
            const have = out[k];
            const here = asRecord(v);
            const prior = asRecord(have);
            if (k === 'hookSpecificOutput' && prior) {
                const ctx = [prior.additionalContext, here?.additionalContext].filter(Boolean).join('\n');
                out[k] = { ...prior, ...here, ...(ctx ? { additionalContext: ctx } : {}) };
            }
            else if (typeof v === 'string' && typeof have === 'string' && ['systemMessage', 'reason', 'stopReason'].includes(k))
                out[k] = `${have}\n${v}`;
            else
                out[k] = v;
        }
    }
    return capOut(toJson(out));
}
