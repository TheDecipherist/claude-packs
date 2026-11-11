// crash-policy: what a call does when a hook crashed on it (KF-18). Only exit 2 blocks, so a crash used to let the call through in
// silence, and doctor said so hours later. Now a crash on a tool call refuses that call once and says why, at the time; the same call
// again goes through, logged, because a broken hook must never stop the write that fixes it (its own bad config, say). An event with
// nothing to refuse (Stop, a prompt) is told with a systemMessage. A crash is never a verdict on the work, and has its own log.
//   crashVerdict(root, ev, judged, now) -> { code?, stderr?, stdout? }   judged: the runner's [{ hook, code, reason }]; now: ms since the epoch
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDir } from './files.mjs';
import { shortHash } from './hash.mjs';
import { readJson, toJson, writeJson } from './json.mjs';
const HELD = join('.claude', 'state', 'crash-held.json');
const HOLD_MS = 60 * 60 * 1000;
const ANSWERS = new Set([0, 2]);
const TOOL_EVENTS = new Set(['PreToolUse', 'PostToolUse', undefined]);
const firstLine = (reason) => (reason ?? '').split('\n')[0]?.replace(/^run-hooks: \S+ failed: /, '') || 'no message';
const say = (c) => `${c.hook} crashed, so this call was not judged by it: ${firstLine(c.reason)}`;
const keyOf = (ev, hook) => shortHash(toJson([hook, ev.hook_event_name, ev.tool_name, ev.tool_input]), 16);
const notice = (message) => toJson({ systemMessage: message });
function readHeld(root) {
    return readJson(join(root, HELD), {}) ?? {}; // not a refusal: no list yet
}
// Records the keys; false when they cannot be kept, since a call refused with no memory of it could never go through.
function hold(root, held, keys, now) {
    if (!existsSync(join(root, '.claude')))
        return false;
    const kept = Object.fromEntries(Object.entries(held).filter(([, t]) => now - t < HOLD_MS));
    for (const k of keys)
        kept[k] = now;
    ensureDir(join(root, '.claude', 'state'));
    return writeJson(join(root, HELD), kept);
}
export function crashVerdict(root, ev, judged, now) {
    const crashed = judged.filter((h) => !ANSWERS.has(h.code));
    const first = crashed[0];
    if (!first)
        return {};
    const said = crashed.map(say).join('\n');
    const after = `Clear it once fixed: \`logs clear ${first.hook} fixed|superseded "<why>"\`.`;
    if (!ev.tool_name || !TOOL_EVENTS.has(ev.hook_event_name))
        return { stdout: notice(`${said}\n${after}`) };
    const held = readHeld(root);
    const keys = crashed.map((c) => keyOf(ev, c.hook));
    if (keys.every((k) => held[k]))
        return { stdout: notice(`${said}\nThe call went through unjudged, and the crash is logged (\`logs crashes\`). ${after}`) };
    if (!hold(root, held, keys, now))
        return { stdout: notice(said) };
    const ran = ev.hook_event_name === 'PostToolUse' ? 'The call has already run.' : 'The call has not run.';
    return { code: 2, stderr: `${said}\n${ran} This is a fault in the hook, not a verdict on your work. The same call again goes through unjudged, and is logged. Report the fault. ${after}\n` };
}
