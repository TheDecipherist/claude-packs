// child-group: a hook's children, killable as a group (KWB-205). A hook past its deadline, or whose worker is replaced, must not leave
// what it started running (49 orphaned `while :` spinners, load 31). `startGroup` spawns detached, so the child leads its own process
// group, and tells whoever listens (the daemon's worker reports to its main thread) the group's id while it lives; `killGroup` ends
// the whole group, grandchildren included.
//   startGroup(command, args, options) -> the ChildProcess (detached; stdio is the caller's)
//   killGroup(pid) -> true when a group was signalled
//   killGroups() -> every group this process still has alive (the runner calls it as it exits)
//   watchGroups(listener) -> sets who hears `started`/`ended` (one listener per thread)
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';

export type GroupEvent = { kind: 'started' | 'ended'; pid: number };

const live = new Set<number>();
let listener: ((e: GroupEvent) => void) | null = null;

export function watchGroups(next: ((e: GroupEvent) => void) | null): void { listener = next; }

export function startGroup(command: string, args: readonly string[], options: SpawnOptions = {}): ChildProcess {
  const child = spawn(command, [...args], { ...options, detached: true });
  const pid = child.pid;
  if (pid === undefined) return child;
  live.add(pid);
  listener?.({ kind: 'started', pid });
  child.once('close', () => { live.delete(pid); listener?.({ kind: 'ended', pid }); });
  return child;
}

/** Ends the group led by `pid`. A pid that is not a process id (0 is this group, 1 is init, -1 is everything the user owns) ends nothing.
 *  No TERM goes first, and a daemon that is itself killed leaves its hooks' groups to the sampler's watchdog (a known gap). */
export function killGroup(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try { process.kill(-pid, 'SIGKILL'); return true; } catch { return false; }
}

export function killGroups(): number {
  let n = 0;
  for (const pid of live) if (killGroup(pid)) n += 1;
  live.clear();
  return n;
}
