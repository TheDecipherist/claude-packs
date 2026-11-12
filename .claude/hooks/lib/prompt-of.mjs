// prompt-of: what a transcript entry is, and whether it is the user's own prompt (turn.mts reads a turn from it, last-prompt.mts the prompt).
// A prompt starts a turn; tool results, hook feedback, task notifications and the system's own lines do not.
import { parseJson } from './json.mjs';
const NOT_A_PROMPT = /^\s*(?:<|\[|Stop hook feedback|SubagentStop hook feedback|making-check|Caveat:|This session is being continued)/;
function promptText(e) {
    if (e.type !== 'user' || e.isMeta || e.isSidechain)
        return null;
    const c = e.message?.content;
    if (typeof c === 'string')
        return c;
    if (!Array.isArray(c) || c.some((b) => b?.type === 'tool_result'))
        return null;
    const t = c.filter((b) => b?.type === 'text').map((b) => b?.text ?? '').join('\n');
    return t || null;
}
/** The entry's text when it is the user's own prompt (one that starts a turn), else null. */
export function realPrompt(e) {
    const t = promptText(e);
    return t !== null && !NOT_A_PROMPT.test(t) ? t : null;
}
/** The prompt a transcript line holds, or null. Most lines are tool calls and results, megabytes of them: a line that is no user entry or
 *  holds a tool result is passed over without being parsed. */
export function promptOfLine(line) {
    if (!line.includes('"user"') || line.includes('"type":"tool_result"'))
        return null;
    const e = parseJson(line); // a torn line is null
    return e ? realPrompt(e) : null;
}
/** The prompt a line's bytes hold, or null: a line that is no user entry, or holds a tool result, is passed over undecoded. */
export function promptOfBytes(line) {
    if (line.length === 0 || !line.includes('"user"') || line.includes('"type":"tool_result"'))
        return null;
    return promptOfLine(line.toString('utf8'));
}
