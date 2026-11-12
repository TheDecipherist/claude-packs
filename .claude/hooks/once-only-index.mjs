// once-only-index (PostToolUse, Write|Edit|MultiEdit|NotebookEdit|Bash): the recorder half of once-only (typescript order W4,
// review-2 2.10). once-only judges a write before it lands and writes nothing; this brings the checkout's index of source files
// (lib/dup-index.mts) up to date after a write that happened, so the next judgement reads the files as they are. It refuses
// nothing. A write another hook refused never reaches here (Claude Code fires PostToolUse only for a call that ran), and a
// call that failed says so in its response and is left out. It writes the index in the system's temp folder, never the project.
//   node once-only-index.mjs --selftest
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSource } from './lib/dup.mjs';
import { loadIndex } from './lib/dup-index.mjs';
import { isMain, runAsHook } from './lib/hook-log.mjs';
import { checkoutRoot, insideProject } from './lib/project.mjs';
import { put, runHook, scratchProject, verdicts, writeOf } from './lib/selftest.mjs';
import { readShape } from './lib/shape.mjs';
import { pass } from './lib/verdict.mjs';
import { layoutOfWrite } from './lib/write-layout.mjs';
import { writesOf } from './lib/writes.mjs';
/** True when the tool's response says the call failed: nothing was written, so there is nothing to record. */
function failed(response) {
    if (response === null || typeof response !== 'object')
        return false;
    const r = response;
    return r['is_error'] === true || r['success'] === false || typeof r['error'] === 'string';
}
export const hook = (event, ctx) => {
    if (failed(event.tool_response))
        return pass;
    const roots = new Set();
    for (const w of writesOf(event, event.cwd ?? ctx.cwd, ctx.env)) {
        if (insideProject(ctx.projectDir, w.path, ctx.cwd) && isSource(w.path))
            roots.add(checkoutRoot(ctx.projectDir, w.path, ctx.cwd));
    }
    for (const root of roots) {
        if (ctx.candidates && root === resolve(ctx.projectDir))
            continue; // the resident runner's main thread holds this checkout's index and brings it up to date when it is asked (KWB-201)
        const sample = join(root, 'x');
        loadIndex(root, { layout: layoutOfWrite(ctx, sample), shape: readShape(root) });
    }
    return pass;
};
/** A written source file reaches the worktree's own index, the one once-only judges it against. */
export const worktreeCase = {
    steps: [
        { label: 'a source file written in the worktree is recorded and refused nothing', event: { hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { file_path: '{wt}/src/core/Rec.cpp', content: '// new\n' } }, want: 0 },
    ],
};
export function selftest() {
    const hookFile = fileURLToPath(import.meta.url);
    const dir = scratchProject({ 'src/a.cpp': '// a\nint a() { return 1; }\n', 'design/shape.json': JSON.stringify({ concepts: {}, exclude: [] }) });
    const unseen = () => loadIndex(dir, { persist: false }).read; // files the index does not hold: they would be read again
    const record = (file, response = { success: true }) => runHook(hookFile, dir, { ...writeOf(join(dir, file), '// b\nint b() { return 2; }\n'), hook_event_name: 'PostToolUse', tool_response: response }).status;
    loadIndex(dir); // the index as the last write left it
    const known = unseen();
    put(join(dir, 'src/b.cpp'), '// b\nint b() { return 2; }\n'); // the file lands, and only then is the recorder called
    const stale = unseen();
    const failedCode = record('src/b.cpp', { is_error: true });
    const afterFailed = unseen();
    const docCode = record('docs/notes.md');
    const afterDoc = unseen();
    const code = record('src/b.cpp');
    const recorded = unseen();
    return verdicts('once-only-index', [
        ['the index is current after it is loaded', known, 0],
        ['a file that landed is unseen by the index until it is recorded', stale, 1],
        ['a call that failed is not recorded', afterFailed, 1],
        ['a document is no source: nothing is recorded for it', afterDoc, 1],
        ['the recorder brings the index up to date after a write that happened', recorded, 0],
        ['a recorder refuses nothing', failedCode === 0 && docCode === 0 && code === 0, true],
    ]);
}
if (isMain(import.meta.url))
    await runAsHook(import.meta.url, 'once-only-index', hook, selftest);
