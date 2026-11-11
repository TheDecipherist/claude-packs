// resident: the resident runner (typescript order W8.2, d-10, review-2-go). One daemon per project folder, shared by every session and
// agent there, serves the hook events the Go proxy sends over a unix socket: the table is loaded once, the hooks sit on a pool of
// worker threads, and an event is answered in the time its hooks take, not the time node takes to start. It is not a hook: no
// settings entry runs it. The client starts it, detached:
//   node .claude/hooks/resident.mjs --serve <project> [--hooks <dir>] [--pool <n>] [--ready-fd <n>] [--idle-minutes <n>]
//   node .claude/hooks/resident.mjs --selftest
// Its files (folder at mode 700, name = 16 hex of the user, project, lock hash and node, lib/proxy-wire.mts daemonFiles): KEY.sock,
// KEY.pid (what `claude-packs daemon status|stop` reads), KEY.lock (the start lock) and daemon-KEY.log. The job of each part lives in
// resident/: socket, pool and worker, event, index, state, lifecycle. The main thread does only socket I/O, framing, the table, the
// repetition index and every state and timing write; hooks run on the workers (review-2-go 2.2).
import { availableParallelism, homedir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from './lib/files.mjs';
import { isMain } from './lib/hook-log.mjs';
import { readHookTable } from './lib/hook-table.mjs';
import { readLayout } from './lib/layout.mjs';
import { real } from './lib/project.mjs';
import { cacheFolder, crashReply, daemonFiles, daemonKey, lockHash } from './lib/proxy-wire.mjs';
import { serveEvent } from './resident/event.mjs';
import { residentIndex } from './resident/index.mjs';
import { IDLE_MS, MAX_AGE_MS, MAX_RSS, daemonLog, reexec, releaseStartLock, sayReady, takeStartLock, watch } from './resident/lifecycle.mjs';
import { startPool } from './resident/pool.mjs';
import { answers, listen, prepareFolder } from './resident/socket.mjs';
import { STATE_EVERY_MS, stateFile } from './resident/state.mjs';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const EXT = extname(fileURLToPath(import.meta.url));
const LOCK_FILE = join('.claude', 'claude-packs.lock.json');
const valueOf = (argv, flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
/** The options a command line gives: `--serve <project>` and its flags; null when it is not one. */
export function serveOptions(argv, host) {
    const project = valueOf(argv, '--serve');
    if (project === undefined)
        return null;
    const n = (flag, otherwise) => { const v = Number(valueOf(argv, flag)); return Number.isFinite(v) && v > 0 ? v : otherwise; };
    const fd = valueOf(argv, '--ready-fd');
    const hooks = valueOf(argv, '--hooks') ?? HERE;
    const pool = Math.floor(n('--pool', Math.min(16, availableParallelism())));
    const minutes = n('--idle-minutes', IDLE_MS / 60_000);
    return {
        project, hooks, pool, idleMs: minutes * 60_000, readyFd: fd === undefined ? null : Number(fd), maxRss: n('--max-rss-mb', MAX_RSS / 1048576) * 1048576, maxAgeMs: MAX_AGE_MS, tickMs: 1000,
        recycleAfter: Math.floor(n('--recycle-after', 500)), poolIdleMs: 10 * 60_000, stateMs: n('--state-ms', STATE_EVERY_MS),
        again: [host.script, '--serve', project, '--hooks', hooks, '--pool', String(pool), '--idle-minutes', String(minutes)],
    };
}
/** Runs the daemon until it stops: 0 when it was stopped, idle or replaced; 1 when it could not start. */
export async function serve(o, host) {
    const project = real(o.project);
    const lock = readText(join(project, LOCK_FILE)) ?? '';
    const key = daemonKey(host.uid, project, lock, host.node);
    const files = daemonFiles(cacheFolder(host.env, host.home, host.platform), key, host.uid);
    const refused = prepareFolder(files.folder, host.uid);
    if (refused !== null) {
        sayReady(o.readyFd, `refused ${refused}\n`);
        return 1;
    }
    const log = daemonLog(files.log);
    if (!takeStartLock(files.lock, process.pid)) {
        sayReady(o.readyFd, 'busy\n');
        return 0;
    }
    if (await answers(files.socket)) {
        releaseStartLock(files.lock);
        sayReady(o.readyFd, 'busy\n');
        return 0;
    }
    const table = readHookTable(o.hooks);
    if (table === null) {
        log(`start refused: ${o.hooks} holds no hook table`);
        releaseStartLock(files.lock);
        sayReady(o.readyFd, 'failed no hook table\n');
        return 1;
    }
    const index = residentIndex(project, () => readLayout(project));
    const hooks = [...new Set(table.filter((r) => !r.async && !r.asyncRewake).map((r) => r.hook))];
    const pool = startPool({
        workerUrl: new URL(`./resident/worker${EXT}`, import.meta.url), data: { dir: o.hooks, hooks, ext: EXT }, warm: o.pool, max: Math.max(32, o.pool),
        idleMs: o.poolIdleMs, recycleAfter: o.recycleAfter, growAfterMs: 15, candidates: index.candidates, log,
    });
    const failed = await pool.ready();
    const counts = { events: 0, last: 0, inflight: 0 };
    const started = Date.now();
    const state = stateFile(files.pid, o.stateMs);
    const snapshot = () => ({
        pid: process.pid, key, project, hooks: o.hooks, node: host.node, lockHash: lockHash(lock), started, lastEvent: counts.last, events: counts.events, workers: pool.size(), rss: process.memoryUsage.rss(), heap: process.memoryUsage().heapUsed,
    });
    const served = { project, table, pool, index, counts, log };
    const listening = await listen(files.socket, (incoming) => {
        counts.inflight += 1;
        serveEvent(served, incoming.request, incoming.stdin, incoming.arrival).then(incoming.reply, (e) => {
            log(`event failed: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
            incoming.reply(crashReply('the daemon failed on this event'));
        }).finally(() => { counts.inflight -= 1; state.save(snapshot()); });
    }, log);
    return new Promise((done) => {
        let ending = false;
        const stop = (reason, again) => {
            if (ending)
                return;
            ending = true;
            log(`stopping: ${reason}`);
            void listening.close().then(() => pool.close()).then(() => {
                state.remove();
                releaseStartLock(files.lock);
                if (again)
                    reexec(host.node, o.again, host.env);
                done(0);
            });
        };
        process.on('uncaughtException', (e) => log(`uncaught exception: ${e.stack ?? e.message}`));
        process.on('unhandledRejection', (e) => log(`unhandled rejection: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`));
        for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP'])
            process.on(sig, () => stop(sig, false));
        watch({ idleMs: o.idleMs, maxAgeMs: o.maxAgeMs, maxRss: o.maxRss, tickMs: o.tickMs, started, last: () => counts.last, busy: () => pool.busy() > 0 || counts.inflight > 0, rss: () => process.memoryUsage.rss(), stop });
        state.save(snapshot(), true);
        releaseStartLock(files.lock);
        log(`started pid ${process.pid}, ${o.pool} workers, ${hooks.length} hooks${failed.length > 0 ? `, failed to load: ${failed.join(', ')}` : ''}, key ${key}`);
        sayReady(o.readyFd, `ready ${process.pid}\n`);
    });
}
if (isMain(import.meta.url)) {
    const argv = process.argv.slice(2);
    const host = { env: process.env, uid: process.getuid?.() ?? 0, home: homedir(), platform: process.platform, node: process.execPath, script: process.argv[1] ?? '' };
    const options = serveOptions(argv, host);
    if (argv.includes('--selftest'))
        process.exit(await (await import('./resident/selftest.mjs')).selftest()); // loaded only here: the daemon never carries it
    else if (options !== null)
        process.exit(await serve(options, host));
    else {
        process.stderr.write('usage: node resident.mjs --serve <project> [--hooks <dir>] [--pool <n>] [--ready-fd <n>] | --selftest\n');
        process.exit(2);
    }
}
