// resident/lifecycle: how the daemon starts and ends (review-2-go 3.1, 3.2, 3.7, 3.9, 3.12). The start lock is a file made with `wx`
// that holds the starter's pid: the daemon that gets it starts, one that finds a live holder says `busy` on the ready pipe and exits,
// one that finds a dead holder takes over. `ready` goes down the pipe the starting client reads, so it never retries in a loop. The
// daemon ends after `idleMs` with no hook event (SessionEnd does nothing), and re-execs itself between events after 24 hours or at
// 400 MB resident, since a hook may leave a timer or a child behind that a one-shot runner dropped by exiting.
import { spawn } from 'node:child_process';
import { appendFileSync, closeSync, openSync, readFileSync, renameSync, rmSync, statSync, writeSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

export const IDLE_MS = 15 * 60_000;
export const MAX_AGE_MS = 24 * 3_600_000;
export const MAX_RSS = 400 * 1024 * 1024;
const LOG_MAX = 1024 * 1024;

const alive = (pid: number): boolean => { try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; } };
const heldBy = (file: string): number => { try { return Number.parseInt(readFileSync(file, 'utf8'), 10); } catch { return Number.NaN; } };

/** The start lock: true when this process holds it now, false when a live daemon is starting (or started). */
export function takeStartLock(file: string, pid: number): boolean {
  for (let tries = 0; tries < 2; tries += 1) {
    try {
      const fd = openSync(file, 'wx');
      writeSync(fd, `${pid}\n`);
      closeSync(fd);
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') return false;
      const holder = heldBy(file);
      if (Number.isInteger(holder) && holder !== pid && alive(holder)) return false;
      rmSync(file, { force: true });   // its holder is gone: a lock left by a crash
    }
  }
  return false;
}
export const releaseStartLock = (file: string): void => rmSync(file, { force: true });

/** One word down the ready pipe (a file descriptor the client gave), if there is one. */
export function sayReady(fd: number | null, text: string): void {
  if (fd === null) return;
  try { writeSync(fd, text); closeSync(fd); } catch { /* the client went away */ }
}

const stamp = (): string => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);

/** The daemon's own log: its output, its starts and what it survived, rotated whole when it passes a megabyte. */
export function daemonLog(file: string, max = LOG_MAX): (line: string) => void {
  return (line) => {
    try {
      appendFileSync(file, `${new Date().toISOString()} ${line}\n`);
      if (statSync(file).size > max) renameSync(file, join(dirname(file), `${basename(file, extname(file))}-${stamp()}${extname(file)}`));
    } catch { /* the log never stops the daemon */ }
  };
}

export interface Watch {
  idleMs: number;
  maxAgeMs: number;
  maxRss: number;
  tickMs: number;
  started: number;
  /** When the last hook event arrived (ms since the epoch), and whether a hook is running now. */
  last: () => number;
  busy: () => boolean;
  rss: () => number;
  /** Ends the daemon, for `reason`; `again` re-execs it after. */
  stop: (reason: string, again: boolean) => void;
}

/** Checks, between events, whether the daemon is idle, old or large. The timer never keeps the process alive. */
export function watch(w: Watch): NodeJS.Timeout {
  const timer = setInterval(() => {
    if (w.busy()) return;
    const now = Date.now();
    if (now - Math.max(w.last(), w.started) > w.idleMs) w.stop(`idle for ${Math.round(w.idleMs / 60_000)} minutes`, false);
    else if (now - w.started > w.maxAgeMs) w.stop('24 hours old', true);
    else if (w.rss() > w.maxRss) w.stop(`${Math.round(w.rss() / 1048576)} MB resident`, true);
  }, w.tickMs);
  timer.unref();
  return timer;
}

/** Starts this same daemon again, detached, in `/`, with HOME, PATH and the cache folder only: the old one has let go of its socket. */
export function reexec(node: string, argv: readonly string[], env: Readonly<Record<string, string | undefined>>): void {
  const keep = Object.fromEntries(['HOME', 'PATH', 'CLAUDE_PACKS_CACHE', 'XDG_RUNTIME_DIR'].flatMap((k) => (env[k] === undefined ? [] : [[k, env[k]]])));
  spawn(node, [...argv], { detached: true, cwd: '/', env: keep, stdio: 'ignore' }).unref();
}
