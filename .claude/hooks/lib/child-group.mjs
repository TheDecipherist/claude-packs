// child-group: a hook's children, killable as a group (KWB-205). A hook past its deadline, or whose worker is replaced, must not leave
// what it started running (49 orphaned `while :` spinners, load 31). `startGroup` spawns detached, so the child leads its own process
// group, and tells whoever listens (the daemon's worker reports to its main thread) the group's id while it lives; `killGroup` ends
// the whole group, grandchildren included.
//   startGroup(command, args, options) -> the ChildProcess (detached; stdio is the caller's)
//   startOrphan(command, args, options) -> the same through `sh`, the command's parent init: for a child that may outlive its thread
//   killGroup(pid) -> true when a group was signalled
//   killGroups() -> every group this process still has alive (the runner calls it as it exits)
//   watchGroups(listener) -> sets who hears `started`/`ended` (one listener per thread)
import { spawn } from 'node:child_process';
const live = new Set();
let listener = null;
export function watchGroups(next) { listener = next; }
/** Whether someone listens: this thread is a daemon worker, whose pool ends the groups it reports when the worker or the daemon ends. */
export const underDaemon = () => listener !== null;
/** Registers `child`'s group with whoever listens, and ends it (`ended`) when `whenOver` calls back. */
function track(child, whenOver) {
    const pid = child.pid;
    if (pid === undefined)
        return child;
    live.add(pid);
    listener?.({ kind: 'started', pid });
    whenOver(() => { live.delete(pid); listener?.({ kind: 'ended', pid }); });
    return child;
}
export function startGroup(command, args, options = {}) {
    const child = spawn(command, [...args], { ...options, detached: true });
    return track(child, (end) => { child.once('close', end); });
}
const ORPHAN_POLL_MS = 500;
const gone = (group) => { try {
    process.kill(-group, 0);
    return false;
}
catch {
    return true;
} };
/** A group that outlives the thread that started it, whose process is not that thread's child (W10b soak: a daemon worker's group, killed when
 *  the worker was recycled, stayed a zombie of the daemon, 54 in an hour, because no thread was left to collect its exit). `sh` starts the
 *  command in the background and exits at once, so the command's parent is init; the group is the shell's, and it ends when its last member does. */
export function startOrphan(command, args, options = {}) {
    const child = spawn('sh', ['-c', '"$0" "$@" &', command, ...args], { ...options, detached: true });
    const pid = child.pid;
    return track(child, (end) => {
        child.once('close', () => {
            const poll = setInterval(() => { if (pid === undefined || gone(pid)) {
                clearInterval(poll);
                end();
            } }, ORPHAN_POLL_MS);
            poll.unref();
        });
    });
}
/** Ends the group led by `pid`. A pid that is not a process id (0 is this group, 1 is init, -1 is everything the user owns) ends nothing.
 *  No TERM goes first, and a daemon that is itself killed leaves its hooks' groups to the sampler's watchdog (a known gap). */
export function killGroup(pid) {
    if (!Number.isInteger(pid) || pid <= 1)
        return false;
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
