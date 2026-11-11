// What a hook's `--selftest` runs on: a throwaway project, the hook run the way Claude Code runs
// it (payload on stdin, CLAUDE_PROJECT_DIR set) and its exit code judged. Every hook proves its
// law this way, so nobody probes a hook by pasting payloads into a shell command, where a guard
// that judges command text can refuse the probe itself (Sub37 WB-4). doctor runs every selftest.
// A selftest module is left out of the repo lint's no-process gates (d-20): it is the one place that runs as a process.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, scratchDir } from './files.mjs';
import { toJson } from './json.mjs';
const made = [];
export { put }; // its importers' name for writing a file; files.mts owns it
export const git = (cwd, ...a) => {
    execFileSync('git', ['-c', 'user.email=selftest@local', '-c', 'user.name=selftest', ...a], { cwd, stdio: 'ignore' });
};
/** files: { "rel/path": "text" }; layout, when given, becomes .claude/layout.json. The folder is removed by `verdicts`. */
export function scratchProject(files = {}, layout = null) {
    const dir = scratchDir('cp-selftest-');
    made.push(dir);
    if (layout)
        put(join(dir, '.claude/layout.json'), toJson(layout));
    for (const [rel, text] of Object.entries(files))
        put(join(dir, rel), text);
    return dir;
}
// A hook event goes through run-hooks.mjs, the way settings.json runs every kit hook (KWB-24), so each selftest proves the
// hook inside the runner; a by-hand mode (args, e.g. --init) runs the hook file itself.
const RUNNER = fileURLToPath(new URL('../run-hooks.mjs', import.meta.url));
export const runHook = (hook, dir, payload, args = []) => {
    const r = spawnSync(process.execPath, args.length || !existsSync(RUNNER) ? [hook, ...args] : [RUNNER, hook], {
        cwd: dir, input: payload ? toJson(payload) : '', encoding: 'utf8',
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    });
    return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
};
export const writeOf = (file_path, content = '// new\n') => ({ tool_name: 'Write', tool_input: { file_path, content } });
export const editOf = (file_path, old_string = 'a', new_string = 'b') => ({ tool_name: 'Edit', tool_input: { file_path, old_string, new_string } });
export const bashOf = (command, cwd) => ({ tool_name: 'Bash', tool_input: { command }, ...(cwd ? { cwd } : {}) });
/** A transcript whose last prompt is `words`, for a hook that reads what the user asked this turn (suite-once, no-find). */
export function promptFile(dir, name, words) {
    const file = join(dir, `${name}.jsonl`);
    put(file, `${toJson({ type: 'user', message: { content: words } })}\n`);
    return file;
}
// cases: [label, actual, wanted]. Prints "<name> selftest: OK (n cases)" or each failure; exit code.
export function verdicts(name, cases) {
    for (const dir of made.splice(0))
        rmSync(dir, { recursive: true, force: true });
    const bad = cases.filter(([, got, want]) => got !== want);
    for (const [label, got, want] of bad)
        console.error(`${name} selftest FAILED: ${label} (got ${got}, wanted ${want})`);
    if (!bad.length)
        console.log(`${name} selftest: OK (${cases.length} cases)`);
    return bad.length ? 1 : 0;
}
