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
import { readText } from './lib/files.mts';
import { isMain } from './lib/hook-log.mts';
import { readHookTable } from './lib/hook-table.mts';
import { toJson } from './lib/json.mts';
import { readLayout } from './lib/layout.mts';
import { real } from './lib/project.mts';
import { cacheFolder, crashReply, daemonFiles, daemonKey, lockHash } from './lib/proxy-wire.mts';
import { WIRE } from './lib/proxy-wire-table.mts';
import { serveEvent, type Served } from './resident/event.mts';
import { residentIndex } from './resident/index.mts';
import { againOf, givenOf, numberOf, textOf } from './resident/options.mts';
import { IDLE_MS, MAX_AGE_MS, MAX_RSS, alive, daemonLog, reexec, releaseStartLock, sayReady, takeStartLock, watch } from './resident/lifecycle.mts';
import { startPool } from './resident/pool.mts';
import { answers, listen, prepareFolder, type Incoming, type Listening } from './resident/socket.mts';
import { SAMPLE_MS, startSampling, type Sampling } from './resident/sampling.mts';
import { STATE_EVERY_MS, stateFile } from './resident/state.mts';
import { StatusKeeper, type Bar } from './resident/status.mts';
import { closeInOrder } from './resident/shutdown.mts';
import { UsageStore } from './resident/usage.mts';
import { ORPHAN_MS, TEST_MS } from './resident/watchdog.mts';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const EXT = extname(fileURLToPath(import.meta.url));
const LOCK_FILE: string = WIRE.lockFile;
/** The warm workers that import every hook at start; the others import a hook when a job first brings it (W8.4: 16 workers holding every hook were 270 MB). */
/** A stop that has not ended the process in this long ends it (each closing step is bounded too, resident/shutdown). */
const FORCE_EXIT_MS = 15_000;
/** Uncaught exceptions and rejections the daemon logs and carries on after, before it restarts itself. */
const MAX_FAULTS = 5;
const PRELOAD = 1;
/** At most this many workers import any one hook while the pool is not full (W8.4). */
const SPREAD = 4;
/** V8 flags the daemon sets before its workers start, for every isolate after (rss: 16 workers that each ran every hook held 389 MB
 *  with V8's defaults and 264 MB with these, build/evidence/rss): no optimizing or baseline compiler, and V8's size-over-speed choices.
 *  A hook runs a few milliseconds of code per event, its time in I/O and regular expressions, which these leave alone. */
export const SMALL_V8 = ['--optimize-for-size', '--no-turbofan', '--no-maglev', '--no-sparkplug'] as const;

/** What the daemon takes of its process, given by whoever starts it (the tail below, or a test). */
export interface Host { env: Readonly<Record<string, string | undefined>>; uid: number; home: string; platform: string; node: string; script: string;
  /** Ends the process: given by the tail below, so a stop that hangs still ends the daemon; a test's host has none. */
  exit?: (code: number) => void }

export interface ServeOptions {
  project: string;
  hooks: string;
  pool: number;
  idleMs: number;
  readyFd: number | null;
  /** `--exit-with <pid>`: the daemon ends when that process does. A selftest's daemons carry it, so none outlives the selftest (KWB-195). */
  exitWith: number | null;
  /** The arguments to start this same daemon again (re-exec), without the ready pipe. */
  again: readonly string[];
  maxRss: number;
  maxAgeMs: number;
  tickMs: number;
  recycleAfter: number;
  poolIdleMs: number;
  /** How often the pid file is rewritten while events are served. */
  stateMs: number;
  /** `--proxy <hook-proxy binary>`: the daemon starts its sampler (`hook-proxy sample`) and stops it with itself; none given, none started (W8.7). */
  proxy: string | null;
  sampleMs: number;
  /** How long an orphan holds a core before the watchdog flags it (`--watchdog-ms`), and a test run over the cap (`--test-ms`). */
  orphanMs: number;
  testMs: number;
  /** `--no-npm`: the daemon never asks npm for the newest kit version (the red dot then reads only what kit-fresh kept); a test's daemon carries it. */
  npm: boolean;
}

/** The options a command line gives: `--serve <project>` and its flags (resident/options.mts is their one table); null when it is not one. */
export function serveOptions(argv: readonly string[], host: Host): ServeOptions | null {
  const at = argv.indexOf(WIRE.flag.serve);
  const project = at >= 0 ? argv[at + 1] : undefined;
  if (project === undefined) return null;
  const given = givenOf(argv);
  const n = (flag: string, otherwise: number): number => numberOf(given, flag, otherwise);
  const fd = textOf(given, WIRE.flag.readyFd);
  const exitWith = n('--exit-with', 0);
  return {
    project, hooks: textOf(given, WIRE.flag.hooks) ?? HERE, pool: Math.floor(n('--pool', Math.min(16, availableParallelism()))), idleMs: n('--idle-minutes', IDLE_MS / 60_000) * 60_000,
    readyFd: fd === undefined ? null : Number(fd), exitWith: exitWith > 0 ? exitWith : null, maxRss: n('--max-rss-mb', MAX_RSS / 1048576) * 1048576, maxAgeMs: MAX_AGE_MS, tickMs: 1000,
    recycleAfter: Math.floor(n('--recycle-after', 500)), poolIdleMs: 10 * 60_000, stateMs: n('--state-ms', STATE_EVERY_MS),
    proxy: textOf(given, WIRE.flag.proxy) ?? null, sampleMs: n('--sample-ms', SAMPLE_MS), orphanMs: n('--watchdog-ms', ORPHAN_MS), testMs: n('--test-ms', TEST_MS), npm: !given.has('--no-npm'),
    again: againOf(host.script, project, given),
  };
}

/** Runs the daemon until it stops: 0 when it was stopped, idle or replaced; 1 when it could not start. */
/** `usage` is this daemon's one store of the sampler's totals: the sampler writes it, the state file and the status line read it (W10b finding 18). */
export async function serve(o: ServeOptions, host: Host, usage = new UsageStore()): Promise<number> {
  const project = real(o.project);
  const lock = readText(join(project, LOCK_FILE)) ?? '';
  const key = daemonKey(host.uid, project, lock, host.node);
  const files = daemonFiles(cacheFolder(host.env, host.home, host.platform), key, host.uid);
  const refused = prepareFolder(files.folder, host.uid);
  if (refused !== null) { sayReady(o.readyFd, `refused ${refused}\n`); return 1; }
  const log = daemonLog(files.log);
  if (!takeStartLock(files.lock, process.pid)) { sayReady(o.readyFd, 'busy\n'); return 0; }
  if (await answers(files.socket)) { releaseStartLock(files.lock); sayReady(o.readyFd, 'busy\n'); return 0; }
  const table = readHookTable(o.hooks);
  if (table === null) { log(`start refused: ${o.hooks} holds no hook table`); releaseStartLock(files.lock); sayReady(o.readyFd, 'failed no hook table\n'); return 1; }
  for (const flag of SMALL_V8) setFlagsFromString(flag);
  const index = residentIndex(project, () => readLayout(project));
  index.warm(new URL(`./resident/warm${EXT}`, import.meta.url));   // the indexes are built beside the start, not on the first Write
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
  let sampling: Sampling | null = null;
  const snapshot = (): Parameters<typeof state.save>[0] => ({
    pid: process.pid, key, project, hooks: o.hooks, node: host.node, lockHash: lockHash(lock), started, lastEvent: counts.last, events: counts.events, workers: pool.size(), rss: process.memoryUsage.rss(), heap: process.memoryUsage().heapUsed,
    usage: usage.all(), flags: sampling?.flags() ?? [], ...(sampling?.pid() ? { sampler: sampling.pid() ?? 0 } : {}),
  });
  // the status line's facts, kept as events arrive and as the sampler reports (W8.6)
  const status = new StatusKeeper({ project, env: host.env, log, usageOf: (owner) => usage.usageOf(owner), ...(o.npm ? {} : { askNpm: () => Promise.resolve(null) }), load: () => import(new URL(`../tools/statusline-live${EXT}`, import.meta.url).href) as Promise<Bar> });
  const served: Served = { project, table, pool, index, counts, log, runner: join(o.hooks, `run-hooks${EXT}`), status };
  const onRequest = (incoming: Incoming): void => {
    // the status line's ask: the daemon's state, no event (counts.last is the idle clock and is left alone, review-2-go 7.1)
    if (incoming.request.status === true && incoming.request.render === true) {   // `hook-proxy status`: the line, drawn from what the daemon holds
      status.render(incoming.stdin.toString('utf8'), incoming.request.env).then((text) => incoming.reply({ code: 0, stdout: text, stderr: '' }),
        () => incoming.reply({ code: 0, stdout: '', stderr: '', fallback: 'ts' }));
      return;
    }
    if (incoming.request.status === true) { incoming.reply({ code: 0, stdout: toJson(snapshot()), stderr: '' }); return; }
    counts.inflight += 1;
    serveEvent(served, incoming.request, incoming.stdin, incoming.arrival).then(incoming.reply, (e: unknown) => {
      log(`event failed: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
      incoming.reply(crashReply('the daemon failed on this event'));
    }).finally(() => { counts.inflight -= 1; state.save(snapshot()); });
  };
  let listening: Listening;
  try { listening = await listen(files.socket, onRequest, log); } catch (e) {
    // the socket could not be made (taken, no right to it, a path too long): nothing is left running, and the client is told
    const why = e instanceof Error ? e.message : String(e);
    log(`start failed: listen: ${why}`);
    await closeInOrder([['pool', () => pool.close()], ['index', () => index.close()]], log);
    releaseStartLock(files.lock);
    sayReady(o.readyFd, `failed listen ${why.replace(/\s+/g, ' ')}\n`);
    return 1;
  }

  return new Promise<number>((done) => {
    let ending = false;
    // process-wide handlers belong to this serve and go with its stop; faults swallowed past a few mean the daemon is in an unknown state
    let faults = 0;
    const fault = (what: string): void => { log(what); faults += 1; if (faults > MAX_FAULTS) stop(`${faults} uncaught faults`, true); };
    const onException = (e: Error): void => fault(`uncaught exception: ${e.stack ?? e.message}`);
    const onRejection = (e: unknown): void => fault(`unhandled rejection: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    const signals = (['SIGTERM', 'SIGINT', 'SIGHUP'] as const).map((sig) => [sig, (): void => stop(sig, false)] as const);
    const stop = (reason: string, again: boolean): void => {
      if (ending) return;
      ending = true;
      log(`stopping: ${reason}`);
      // however a closing step ends, the process ends: a worker that will not terminate must not leave a daemon that serves nothing
      const force = setTimeout(() => host.exit?.(0), FORCE_EXIT_MS);
      force.unref();
      sampling?.stop();
      clearInterval(ticker);
      clearInterval(watcher);
      process.off('uncaughtException', onException);
      process.off('unhandledRejection', onRejection);
      for (const [sig, handler] of signals) process.off(sig, handler);
      void closeInOrder([['socket', () => listening.close()], ['pool', () => pool.close()], ['index', () => index.close()], ['state', () => state.remove()], ['start lock', () => releaseStartLock(files.lock)]], log)
        .then(() => (again ? reexec(host.node, o.again, host.env, log) : undefined))
        .finally(() => { clearTimeout(force); done(0); });
    };
    const ticker = setInterval(() => status.tick(Date.now()), o.sampleMs);
    ticker.unref();
    void status.refreshNewest(Date.now());
    process.on('uncaughtException', onException);
    process.on('unhandledRejection', onRejection);
    for (const [sig, handler] of signals) process.on(sig, handler);
    const watcher = watch({
      idleMs: o.idleMs, maxAgeMs: o.maxAgeMs, maxRss: o.maxRss, tickMs: o.tickMs, started, last: () => counts.last, busy: () => pool.busy() > 0 || counts.inflight > 0,
      rss: () => process.memoryUsage.rss(), workers: pool.size, parentGone: () => o.exitWith !== null && !alive(o.exitWith), replaced: () => (readText(join(project, LOCK_FILE)) ?? '') !== lock, stop,
    });
    if (o.proxy !== null) sampling = startSampling({ proxy: o.proxy, project, intervalMs: o.sampleMs, orphanMs: o.orphanMs, testMs: o.testMs, log, env: host.env, store: usage });
    state.save(snapshot(), true);
    releaseStartLock(files.lock);
    log(`started pid ${process.pid}, ${o.pool} workers, ${hooks.length} hooks${failed.length > 0 ? `, failed to load: ${failed.join(', ')}` : ''}, key ${key}`);
    sayReady(o.readyFd, `ready ${process.pid}\n`);
  });
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  const host: Host = { env: process.env, uid: process.getuid?.() ?? 0, home: homedir(), platform: process.platform, node: process.execPath, script: process.argv[1] ?? '', exit: (code) => process.exit(code) };
  const options = serveOptions(argv, host);
  if (argv.includes('--selftest')) process.exit(await (await import('./resident/selftest.mts')).selftest());   // loaded only here: the daemon never carries it
  else if (options !== null) process.exit(await serve(options, host));
  else { process.stderr.write(`usage: node resident.mjs ${WIRE.flag.serve} <project> [${WIRE.flag.hooks} <dir>] [--pool <n>] [${WIRE.flag.readyFd} <n>] | --selftest\n`); process.exit(2); }
}
