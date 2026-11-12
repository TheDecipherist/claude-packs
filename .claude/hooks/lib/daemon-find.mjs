// daemon-find: the resident runners of a project, found by their pid files (typescript order W8.2, W8.4). `claude-packs daemon`, doctor
// (which says when the running daemon's kit is not the lock's) and the status line (which asks the socket) all find a daemon here.
// A project can have more than one (an old kit version's, until it is idle).
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { real } from './project.mjs';
import { socketFolders, socketOf } from './proxy-wire.mjs';
import { readState } from '../resident/state.mjs';
/** Whether a process is alive: signal 0 reaches it, or it exists but another user owns it (EPERM). The one `alive` of the kit. */
export const alive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (e) {
        return e instanceof Error && 'code' in e && e.code === 'EPERM';
    }
};
/** The pid files of the project's daemons, in the folders a daemon may have used (its own, and the /tmp one for a long path). */
export function daemonsOf(dir, host) {
    const project = real(dir);
    return socketFolders(host).filter((f) => existsSync(f)).flatMap((f) => readdirSync(f).filter((n) => n.endsWith('.pid')).map((n) => join(f, n)))
        .flatMap((file) => {
        const state = readState(file);
        return state !== null && state.project === project ? [{ file, socket: socketOf(dirname(file), state.key), state }] : [];
    });
}
