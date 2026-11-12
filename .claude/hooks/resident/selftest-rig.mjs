// resident/selftest-rig: what the daemon's selftests (and the load tests under test/integration) stand on: a scratch project with a hooks
// folder of planted hooks and a table, a cache folder, a real daemon started the way the client starts it, and a fake client that
// does what the Go proxy does: ask the socket, start a daemon on none, and judge by the TypeScript runner when the daemon cannot.
import { chmodSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, put, readText, scratchDir } from '../lib/files.mjs';
import { toJson } from '../lib/json.mjs';
import { real } from '../lib/project.mjs';
import { askDaemon, startDaemon } from '../lib/proxy-client.mjs';
import { PROTOCOL, daemonFiles, daemonKey } from '../lib/proxy-wire.mjs';
import { readState } from './state.mjs';
import { runEvent } from '../run-hooks.mjs';
export const EXT = extname(fileURLToPath(import.meta.url));
export const RESIDENT = fileURLToPath(new URL(`../resident${EXT}`, import.meta.url));
const UID = process.getuid?.() ?? 0;
const LOCK = join('.claude', 'claude-packs.lock.json');
/** A scratch project (`layout` is its .claude/layout.json) whose hooks folder holds the plants and their table, and an empty cache. */
export function makeRig(plants, layout = {}, prefix = 'resident-') {
    const dir = scratchDir(prefix);
    const hooks = join(dir, '.claude', 'hooks');
    ensureDir(hooks);
    put(join(dir, '.claude', 'layout.json'), toJson({ folders: {}, concepts: {}, ...layout }));
    put(join(dir, LOCK), toJson({ kit: 'selftest', packs: [], files: {} }));
    const table = plants.map((p) => ({ hook: p.name, ...p.row }));
    for (const p of plants)
        put(join(hooks, `${p.name}${EXT}`), p.source);
    put(join(hooks, 'hooks.json'), toJson(table));
    // short, so the socket's path is under the limit whatever TMPDIR is (a longer one would send the daemon to /tmp/claude-packs-<uid>)
    const cache = mkdtempSync('/tmp/cp-');
    chmodSync(cache, 0o700);
    return { dir, hooks, cache, table, pids: new Set() };
}
const envOf = (rig) => ({ HOME: rig.dir, PATH: process.env.PATH, CLAUDE_PACKS_CACHE: rig.cache });
/** The daemon's files for the rig's project as its lock reads now: the key is what the client computes. */
export const filesOf = (rig) => daemonFiles(rig.cache, daemonKey(UID, real(rig.dir), readText(join(rig.dir, LOCK)) ?? '', process.execPath), UID);
/** Starts a daemon for the rig the way the Go client does; `args` are its flags (`--pool 4`). */
export async function start(rig, args = ['--pool', '4']) {
    const started = await startDaemon({ node: process.execPath, script: RESIDENT, args: ['--serve', rig.dir, '--hooks', rig.hooks, ...args, '--no-npm', '--exit-with', String(process.pid)], env: envOf(rig) });
    if (started.kind === 'ready')
        rig.pids.add(started.pid);
    return started;
}
export const request = (rig, over = {}) => ({ v: PROTOCOL, env: { CLAUDE_PROJECT_DIR: rig.dir, PATH: process.env.PATH ?? '' }, cwd: rig.dir, ppid: 4242, deadline: Date.now() + 8000, ...over });
/** An event as Claude Code writes it on stdin: the tool names the hooks that reach it. */
export const eventText = (rig, tool, input = {}, name = 'PreToolUse') => toJson({ hook_event_name: name, tool_name: tool, tool_input: input, session_id: 's1', cwd: rig.dir });
/** What the Go proxy does with one event: the daemon answers, or (no daemon, a cut reply, a refusal to take it) the TypeScript runner
 *  judges it on the same stdin; with none running the client starts one behind it and asks once more. */
export async function client(rig, text, over = {}, startArgs) {
    const req = request(rig, over);
    const sock = filesOf(rig).socket;
    let answer = await askDaemon(sock, req, text);
    let started;
    if (answer.kind === 'none') {
        started = await start(rig, startArgs);
        if (started.kind === 'ready')
            answer = await askDaemon(sock, req, text);
    }
    if (answer.kind === 'reply' && answer.reply.fallback === undefined)
        return { reply: answer.reply, path: 'daemon', ...(started ? { started } : {}) };
    const caller = { env: req.env, stdout: process.stdout, stderr: process.stderr, cwd: req.cwd, sessionPid: req.ppid };
    const r = await runEvent(rig.table, rig.hooks, text, rig.dir, caller);
    return { reply: { code: r.code, stdout: r.stdout, stderr: r.stderr }, path: 'ts', ...(started ? { started } : {}) };
}
/** One request straight to the rig's daemon: its reply as it came, or a crash (no client behaviour added). */
export async function ask(rig, text, over = {}) {
    const a = await askDaemon(filesOf(rig).socket, request(rig, over), text);
    return a.kind === 'none' ? { code: 1, stdout: '', stderr: `no daemon: ${a.why}`, fallback: 'ts' } : a.reply;
}
export const alive = (pid) => { try {
    process.kill(pid, 0);
    return true;
}
catch {
    return false;
} };
export const waitFor = async (what, ms = 5000) => {
    for (const t = Date.now(); Date.now() - t < ms; await new Promise((d) => setTimeout(d, 20)))
        if (what())
            return true;
    return what();
};
/** A rig no daemon was started for: its folders removed. */
export const dropRig = (rig) => { rmSync(rig.cache, { recursive: true, force: true }); rmSync(rig.dir, { recursive: true, force: true }); };
/** Every daemon the rig's cache holds a pid file for, and every one it started: stopped, and waited for. */
export async function stopAll(rig) {
    const pids = new Set(rig.pids);
    for (const f of existsSync(rig.cache) ? readdirSync(rig.cache) : []) {
        const state = f.endsWith('.pid') ? readState(join(rig.cache, f)) : null;
        if (state)
            pids.add(state.pid);
    }
    for (const pid of pids)
        try {
            process.kill(pid, 'SIGTERM');
        }
        catch { /* gone */ }
    await Promise.all([...pids].map((pid) => waitFor(() => !alive(pid), 5000)));
    for (const pid of pids)
        if (alive(pid))
            try {
                process.kill(pid, 'SIGKILL');
            }
            catch { /* gone */ }
    rmSync(rig.cache, { recursive: true, force: true });
}
