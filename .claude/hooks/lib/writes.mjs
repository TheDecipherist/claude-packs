// writes: every file one tool call writes, whichever tool it is (WB-69: close the route, not just the
// brief). A guard that refuses a write judges these, so Write, Edit, MultiEdit, NotebookEdit and the
// shell (>, >>, tee, sed -i, cp, mv, a heredoc into a file, an inline program's own writes (KWB-8), ...) are one route each into the same check.
//   writesOf(payload, base, env) -> [{ path, op, before, after }]
//     path: absolute; op: write, edit, append, copy, move, link, truncate, touch, delete (see shell-writes.mts)
//     before: the file's text now ('' when it does not exist); after: its text once the call has run, or null
//     when that cannot be known (a perl -i, an inline program's write of text it builds). A guard that judges paths needs only path;
//     one that judges content judges after, and lets an unknown after through.
// Nothing here reads the process (typescript order W3.3): the folder a relative path is measured from, the environment a
// shell path expands from and the stream a refusal is written to come from the caller, which read them from its event.
import { relative, resolve } from 'node:path';
import { checkoutRoot, commandLeavesProject, insideProject } from './project.mjs';
import { computeEdit } from './apply-edit.mjs';
import { parseJson } from './json.mjs';
import { afterText, readText, shellWrites } from './shell-writes.mjs';
export const WRITE_TOOLS = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash'];
/** The text of a notebook cell once a NotebookEdit has run: the cell appended on its own line, or the file as it was on a delete. */
function notebookAfter(before, source, mode) {
    if (mode === 'delete')
        return before;
    return `${before}${before && !before.endsWith('\n') ? '\n' : ''}${source}${source.endsWith('\n') ? '' : '\n'}`;
}
/** Several writes to one file in one command (`sed -i A f && sed -i B f`) are one change: each reads what the one before it left,
 *  and the file is judged once, from what it was to what the last one leaves (KWB-13: each was read against the file on disk, and
 *  the two different results were judged as two copies of the file). */
function shellChanges(writes) {
    const byPath = new Map();
    for (const w of writes) {
        const prev = byPath.get(w.path);
        const r = prev ? (prev.after === null ? { before: prev.before, after: null } : afterText(w, prev.after)) : afterText(w);
        byPath.set(w.path, prev ? { ...prev, op: w.op === 'delete' ? 'delete' : prev.op, after: r.after } : { path: w.path, op: w.op, ...r });
    }
    return [...byPath.values()];
}
/** Every file the event's tool call writes. `base` is the folder a relative path is measured from, `env` what a shell path expands from. */
export function writesOf(payload, base, env) {
    const input = payload.tool_input ?? {};
    const tool = payload.tool_name;
    if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit') {
        if (!input.file_path)
            return [];
        const path = resolve(base, input.file_path);
        const r = computeEdit(tool, { ...input, file_path: path });
        return [{ path, op: tool === 'Write' ? 'write' : 'edit', before: r?.before ?? readText(path) ?? '', after: r?.after ?? null }];
    }
    if (tool === 'NotebookEdit') {
        if (!input.notebook_path)
            return [];
        const path = resolve(base, input.notebook_path);
        const before = readText(path) ?? '';
        return [{ path, op: 'edit', before, after: notebookAfter(before, input.new_source ?? '', input.edit_mode) }];
    }
    if (tool === 'Bash')
        return shellChanges(shellWrites(input.command ?? '', payload.cwd ?? base, env));
    return [];
}
/** The event on stdin as a value, or null when it is not a JSON object. The one place a payload is parsed. */
export function readPayload(text) {
    const event = parseJson(text);
    return event !== null && typeof event === 'object' && !Array.isArray(event) ? event : null;
}
// One guard's frame (0.10.0): read the event, judge its shell command (`command(text, cwd)`, unless it leaves the project) and
// every write inside the project (`write(w, rel)`, rel from the file's own checkout); the first finding refuses, exit 2.
// A finding that starts with "BLOCKED" is written as it is, any other as "BLOCKED by <name>: <finding>".
export function judgeEvent(text, { name, command = null, write = null }, run) {
    const payload = readPayload(text);
    if (!payload)
        return 0;
    const here = run.cwd();
    const cwd = payload.cwd ?? here;
    const root = run.env.CLAUDE_PROJECT_DIR ?? here;
    const refuse = (msg) => { run.stderr.write(msg.startsWith('BLOCKED') ? msg : `BLOCKED by ${name}: ${msg}\n`); return 2; };
    const cmd = payload.tool_input?.command ?? '';
    if (command && payload.tool_name === 'Bash' && !commandLeavesProject(root, cmd, here, run.env.HOME)) {
        const msg = command(cmd, cwd);
        if (msg)
            return refuse(msg);
    }
    if (write)
        for (const w of writesOf(payload, cwd, run.env)) {
            if (!insideProject(root, w.path, cwd))
                continue;
            const msg = write(w, relative(checkoutRoot(root, w.path, here), w.path));
            if (msg)
                return refuse(msg);
        }
    return 0;
}
