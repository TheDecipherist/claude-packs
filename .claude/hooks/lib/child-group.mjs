// child-group: a hook's children, killable as a group (KWB-205). A hook past its deadline, or whose worker is replaced, must not leave
// what it started running (49 orphaned `while :` spinners, load 31). `startGroup` spawns detached, so the child leads its own process
// group, and tells whoever listens (the daemon's worker reports to its main thread) the group's id while it lives; `killGroup` ends
// the whole group, grandchildren included.
//   startGroup(command, args, options) -> the ChildProcess (detached; stdio is the caller's)
//   killGroup(pid) -> true when a group was signalled
//   killGroups() -> every group this process still has alive (the runner calls it as it exits)
//   watchGroups(listener) -> sets who hears `started`/`ended` (one listener per thread)
import { spawn } from 'node:child_process';
const live = new Set();
let listener = null;
export function watchGroups(next) { listener = next; }
export function startGroup(command, args, options = {}) {
    const child = spawn(command, [...args], { ...options, detached: true });
    const pid = child.pid;
    if (pid === undefined)
        return child;
    live.add(pid);
    listener?.({ kind: 'started', pid });
    child.once('close', () => { live.delete(pid); listener?.({ kind: 'ended', pid }); });
    return child;
}
export function killGroup(pid) {
    try {
        process.kill(-pid, 'SIGKILL');
        return true;
    }
    catch {
        return false;
    }
}
export function killGroups() {
    let n = 0;
    for (const pid of live)
        if (killGroup(pid))
            n += 1;
    live.clear();
    return n;
}
