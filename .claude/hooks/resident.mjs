var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
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
import { setFlagsFromString } from 'node:v8';
import { readText } from './lib/files.mjs';
import { isMain } from './lib/hook-log.mjs';
import { readHookTable } from './lib/hook-table.mjs';
import { toJson } from './lib/json.mjs';
import { readLayout } from './lib/layout.mjs';
import { real } from './lib/project.mjs';
import { cacheFolder, crashReply, daemonFiles, daemonKey, lockHash } from './lib/proxy-wire.mjs';
import { serveEvent } from './resident/event.mjs';
import { residentIndex } from './resident/index.mjs';
import { IDLE_MS, MAX_AGE_MS, MAX_RSS, alive, daemonLog, reexec, releaseStartLock, sayReady, takeStartLock, watch } from './resident/lifecycle.mjs';
import { startPool } from './resident/pool.mjs';
import { answers, listen, prepareFolder } from './resident/socket.mjs';
import { SAMPLE_MS, startSampling } from './resident/sampling.mjs';
import { STATE_EVERY_MS, stateFile } from './resident/state.mjs';
import { StatusKeeper } from './resident/status.mjs';
import { usage } from './resident/usage.mjs';
import { ORPHAN_MS, TEST_MS } from './resident/watchdog.mjs';
const HERE = fileURLToPath(new URL('.', import.meta.url));
const EXT = extname(fileURLToPath(import.meta.url));
const LOCK_FILE = join('.claude', 'claude-packs.lock.json');
/** The warm workers that import every hook at start; the others import a hook when a job first brings it (W8.4: 16 workers holding every hook were 270 MB). */
const PRELOAD = 1;
/** At most this many workers import any one hook while the pool is not full (W8.4). */
const SPREAD = 4;
/** V8 flags the daemon sets before its workers start, for every isolate after (rss: 16 workers that each ran every hook held 389 MB
 *  with V8's defaults and 264 MB with these, build/evidence/rss): no optimizing or baseline compiler, and V8's size-over-speed choices.
 *  A hook runs a few milliseconds of code per event, its time in I/O and regular expressions, which these leave alone. */
export const SMALL_V8 = ['--optimize-for-size', '--no-turbofan', '--no-maglev', '--no-sparkplug'];
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
    const exitWith = n('--exit-with', 0);
    const proxy = valueOf(argv, '--proxy');
    return {
        project, hooks, pool, idleMs: minutes * 60_000, readyFd: fd === undefined ? null : Number(fd), exitWith: exitWith > 0 ? exitWith : null, maxRss: n('--max-rss-mb', MAX_RSS / 1048576) * 1048576, maxAgeMs: MAX_AGE_MS, tickMs: 1000,
        recycleAfter: Math.floor(n('--recycle-after', 500)), poolIdleMs: 10 * 60_000, stateMs: n('--state-ms', STATE_EVERY_MS),
        proxy: valueOf(argv, '--proxy') ?? null, sampleMs: n('--sample-ms', SAMPLE_MS), orphanMs: n('--watchdog-ms', ORPHAN_MS), testMs: n('--test-ms', TEST_MS), npm: !argv.includes('--no-npm'),
        again: [host.script, '--serve', project, '--hooks', hooks, '--pool', String(pool), '--idle-minutes', String(minutes), ...(exitWith > 0 ? ['--exit-with', String(exitWith)] : []), ...(proxy === undefined ? [] : ['--proxy', proxy]), ...(argv.includes('--no-npm') ? ['--no-npm'] : [])],
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
    for (const flag of SMALL_V8)
        setFlagsFromString(flag);
    const index = residentIndex(project, () => readLayout(project));
    index.warm(new URL(`./resident/warm${EXT}`, import.meta.url)); // the indexes are built beside the start, not on the first Write
    const hooks = [...new Set(table.filter((r) => !r.async && !r.asyncRewake).map((r) => r.hook))];
    // the pool never grows past its size: a burst of 16 events at once grew it to 20 to 22 workers, each about 10 MB the daemon kept (rss)
    const pool = startPool({
        workerUrl: new URL(`./resident/worker${EXT}`, import.meta.url), data: { dir: o.hooks, hooks, ext: EXT }, warm: o.pool, preload: Math.min(PRELOAD, o.pool), spread: SPREAD, max: o.pool,
        idleMs: o.poolIdleMs, recycleAfter: o.recycleAfter, growAfterMs: 40, candidates: index.candidates, warming: index.warming, log,
    });
    const failed = await pool.ready();
    const counts = { events: 0, last: 0, inflight: 0 };
    const started = Date.now();
    const state = stateFile(files.pid, o.stateMs);
    let sampling = null;
    const snapshot = () => ({
        pid: process.pid, key, project, hooks: o.hooks, node: host.node, lockHash: lockHash(lock), started, lastEvent: counts.last, events: counts.events, workers: pool.size(), rss: process.memoryUsage.rss(), heap: process.memoryUsage().heapUsed,
        usage: usage.all(), flags: sampling?.flags() ?? [], ...(sampling?.pid() ? { sampler: sampling.pid() ?? 0 } : {}),
    });
    // the status line's facts, kept as events arrive and as the sampler reports (W8.6)
    const status = new StatusKeeper({ project, env: host.env, log, ...(o.npm ? {} : { askNpm: () => Promise.resolve(null) }), load: () => import(__rewriteRelativeImportExtension(new URL(`../tools/statusline-live${EXT}`, import.meta.url).href)) });
    const served = { project, table, pool, index, counts, log, runner: join(o.hooks, `run-hooks${EXT}`), status };
    const listening = await listen(files.socket, (incoming) => {
        // the status line's ask: the daemon's state, no event (counts.last is the idle clock and is left alone, review-2-go 7.1)
        if (incoming.request.status === true && incoming.request.render === true) { // `hook-proxy status`: the line, drawn from what the daemon holds
            status.render(incoming.stdin.toString('utf8'), incoming.request.env).then((text) => incoming.reply({ code: 0, stdout: text, stderr: '' }), () => incoming.reply({ code: 0, stdout: '', stderr: '', fallback: 'ts' }));
            return;
        }
        if (incoming.request.status === true) {
            incoming.reply({ code: 0, stdout: toJson(snapshot()), stderr: '' });
            return;
        }
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
            sampling?.stop();
            clearInterval(ticker);
            void listening.close().then(() => pool.close()).then(() => {
                index.close();
                state.remove();
                releaseStartLock(files.lock);
                if (again)
                    reexec(host.node, o.again, host.env);
                done(0);
            });
        };
        const ticker = setInterval(() => status.tick(Date.now()), o.sampleMs);
        ticker.unref();
        void status.refreshNewest(Date.now());
        process.on('uncaughtException', (e) => log(`uncaught exception: ${e.stack ?? e.message}`));
        process.on('unhandledRejection', (e) => log(`unhandled rejection: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`));
        for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP'])
            process.on(sig, () => stop(sig, false));
        watch({
            idleMs: o.idleMs, maxAgeMs: o.maxAgeMs, maxRss: o.maxRss, tickMs: o.tickMs, started, last: () => counts.last, busy: () => pool.busy() > 0 || counts.inflight > 0,
            rss: () => process.memoryUsage.rss(), workers: pool.size, parentGone: () => o.exitWith !== null && !alive(o.exitWith), replaced: () => (readText(join(project, LOCK_FILE)) ?? '') !== lock, stop,
        });
        if (o.proxy !== null)
            sampling = startSampling({ proxy: o.proxy, project, intervalMs: o.sampleMs, orphanMs: o.orphanMs, testMs: o.testMs, log, env: host.env });
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
