// One sample of the soak (typescript order W10b item 1): what the daemon, its sampler and the cache folder hold at this moment. The row is
// the order's list: the daemon's RSS and V8 heap used (after a forced collection, through the inspector), its open file descriptors, its
// worker count, its child processes, the sampler's RSS and Go heap (the memstats line its SIGUSR1 prints into the daemon's log), the socket,
// pid and lock files in the cache folder. Used by scripts/soak.mts and by the leak checks (test/integration/soak-leaks.test.mts).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { alive, daemonsOf, type DaemonHost, type FoundDaemon } from '../packs/base/hooks/lib/daemon-find.mts';
import { descendants, processTable, type ProcessRow } from '../packs/base/hooks/lib/own-processes.mts';
import { socketFolders } from '../packs/base/hooks/lib/proxy-wire.mts';
import { forcedHeap, type Inspector } from './soak-inspect.mts';

const MB = 1048576;
const MEMSTATS_WAIT_MS = 400;

export interface Row {
  /** Seconds since the start of the run. */
  t: number;
  pid: number | null;
  /** Live daemons of the project (an old kit's lingers until idle). */
  daemons: number;
  events: number | null;
  rssMb: number | null;
  /** V8 heap in use after a forced collection (MB), null without an inspector. */
  heapMb: number | null;
  /** The heap in use as the daemon last wrote it to its pid file, not collected (MB). */
  heapStateMb: number | null;
  fds: number | null;
  workers: number | null;
  /** Descendants of the daemon, the sampler counted in; the daemon's own children (neither the sampler nor a git look that ends by itself); those looks. */
  children: number | null;
  childrenNoSampler: number | null;
  transient: number | null;
  /** What the daemon's own children are, by command (age in seconds, first 110 characters), when there are more than a few: the leak evidence. */
  kids?: string[];
  samplerPid: number | null;
  samplerRssMb: number | null;
  samplerGoHeapMb: number | null;
  samplerGoSysMb: number | null;
  sockets: number;
  pidFiles: number;
  lockFiles: number;
}

export const hostOf = (cache: string): DaemonHost => ({ env: { CLAUDE_PACKS_CACHE: cache }, home: homedir(), platform: process.platform, uid: process.getuid?.() ?? 0 });

/** Resident megabytes of `pid` as ps reads it (null: gone). */
export function rssMbOf(pid: number): number | null {
  const kb = Number(spawnSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim());
  return Number.isFinite(kb) && kb > 0 ? mb(kb * 1024) : null;
}

/** Open file descriptors of `pid` (lsof's `f` lines), null when it cannot be read. */
export function fdCount(pid: number): number | null {
  const r = spawnSync('lsof', ['-p', String(pid), '-F', 'f'], { encoding: 'utf8', maxBuffer: 1 << 24 });
  return r.status === 0 || r.stdout !== '' ? r.stdout.split('\n').filter((l) => l.startsWith('f')).length : null;
}

/** The project's daemon files, by suffix, in every folder a daemon of this host may use (a long path puts them in /tmp, where other projects'
 *  daemons are too: only the names of `keys`, the daemon keys this run has seen, count). */
export function cacheCounts(h: DaemonHost, keys: ReadonlySet<string>): { sockets: number; pidFiles: number; lockFiles: number } {
  const names = socketFolders(h).filter((f) => existsSync(f)).flatMap((f) => readdirSync(f)).filter((x) => [...keys].some((k) => x.startsWith(`${k}.`)));
  const n = (suffix: string): number => names.filter((x) => x.endsWith(suffix)).length;
  return { sockets: n('.sock'), pidFiles: n('.pid'), lockFiles: n('.lock') };
}

/** The sampler's Go heap and system bytes: SIGUSR1 makes it print a memstats line, which the daemon copies into its log. */
export async function samplerMemstats(sampler: number, log: string): Promise<{ heap: number; sys: number } | null> {
  const before = existsSync(log) ? readFileSync(log, 'utf8').split('\n').length : 0;
  try { process.kill(sampler, 'SIGUSR1'); } catch { return null; }
  await sleep(MEMSTATS_WAIT_MS);
  const lines = existsSync(log) ? readFileSync(log, 'utf8').split('\n').slice(Math.max(0, before - 1)) : [];
  const m = [...lines].reverse().map((l) => /memstats heapAlloc=(\d+) heapSys=(\d+)/.exec(l)).find((x) => x !== null);
  return m === undefined || m === null ? null : { heap: Number(m[1]), sys: Number(m[2]) };
}

/** The live daemon of the project that started last (null: none), and how many are live. */
export function newestDaemon(h: DaemonHost, dir: string): { found: FoundDaemon; live: number } | null {
  const live = daemonsOf(dir, h).filter((d) => alive(d.state.pid));
  const found = [...live].sort((a, b) => b.state.started - a.state.started)[0];
  return found === undefined ? null : { found, live: live.length };
}

/** The git looks the daemon starts and that end by themselves (git-guard's detached refresh and the git it runs, W8.3): not the daemon's own children. */
export const isGitLook = (cmd: string): boolean => /git-guard\.mjs --refresh|(^|\/)git( |$)|git-upload-pack|git-receive-pack|git-remote/.test(cmd);

const mb = (bytes: number): number => Math.round((bytes / MB) * 10) / 10;

/** One sample. `inspector` reads the forced heap of the daemon; none given, the heap column stays null. */
export async function sampleRow(t: number, dir: string, h: DaemonHost, inspector: Inspector | null, keys: Set<string>): Promise<Row> {
  const d = newestDaemon(h, dir);
  if (d !== null) keys.add(d.found.state.key);
  const files = cacheCounts(h, keys);
  const empty: Row = { t, pid: null, daemons: 0, events: null, rssMb: null, heapMb: null, heapStateMb: null, fds: null, workers: null, children: null, childrenNoSampler: null, transient: null,
    samplerPid: null, samplerRssMb: null, samplerGoHeapMb: null, samplerGoSysMb: null, ...files };
  if (d === null) return empty;
  const { state, file } = d.found;
  const table = processTable();
  const kids = [...descendants(table, state.pid)];
  const describe = (r: ProcessRow): string => `${r.pid} ppid ${r.ppid} ${r.age}s ${r.cmd.slice(0, 110)}`;
  const transient = kids.filter((p) => isGitLook(table.find((r) => r.pid === p)?.cmd ?? ''));
  const sampler = state.sampler ?? null;
  const own = table.filter((r) => kids.includes(r.pid) && r.pid !== sampler && !isGitLook(r.cmd));
  const samplerRss = sampler === null ? null : rssMbOf(sampler);
  const go = sampler === null || samplerRss === null ? null : await samplerMemstats(sampler, join(dirname(file), `daemon-${state.key}.log`));
  return {
    ...empty, pid: state.pid, daemons: d.live, events: state.events, rssMb: rssMbOf(state.pid), heapStateMb: mb(state.heap),
    heapMb: inspector === null ? null : mb(await forcedHeap(inspector)), fds: fdCount(state.pid), workers: state.workers, children: kids.length,
    childrenNoSampler: own.length, transient: transient.length, ...(own.length > 5 ? { kids: own.slice(0, 12).map(describe) } : {}), samplerPid: samplerRss === null ? null : sampler, samplerRssMb: samplerRss,
    samplerGoHeapMb: go === null ? null : mb(go.heap), samplerGoSysMb: go === null ? null : mb(go.sys),
  };
}

/** Least-squares slope of `ys` against `xs` (seconds), in units per 10 minutes. */
export function slopePer10Min(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((a, x, i) => a + (x - mx) * ((ys[i] ?? 0) - my), 0);
  const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  return den === 0 ? 0 : (num / den) * 600;
}
