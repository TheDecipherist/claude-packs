// daemon-find: the resident runners of a project, found by their pid files (typescript order W8.2, W8.4). `claude-packs daemon`, doctor
// (which says when the running daemon's kit is not the lock's) and the status line (which asks the socket) all find a daemon here.
// A project can have more than one (an old kit version's, until it is idle).
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { real } from './project.mts';
import { cacheFolder } from './proxy-wire.mts';
import { readState, type DaemonState } from '../resident/state.mts';

/** What a caller says of the machine: the environment, the home folder, the platform and the user. */
export interface DaemonHost { env: Readonly<Record<string, string | undefined>>; home: string; platform: string; uid: number }

/** A daemon's pid file, what it holds, and the socket beside it. */
export interface FoundDaemon { file: string; socket: string; state: DaemonState }

/** Whether a process is alive: signal 0 reaches it, or it exists but another user owns it (EPERM). The one `alive` of the kit. */
export const alive = (pid: number): boolean => {
  try { process.kill(pid, 0); return true; } catch (e) { return e instanceof Error && 'code' in e && e.code === 'EPERM'; }
};

/** The pid files of the project's daemons, in the folders a daemon may have used (its own, and the /tmp one for a long path). */
export function daemonsOf(dir: string, host: DaemonHost): FoundDaemon[] {
  const project = real(dir);
  const folders = [cacheFolder(host.env, host.home, host.platform), join('/tmp', `claude-packs-${host.uid}`)];
  return folders.filter((f) => existsSync(f)).flatMap((f) => readdirSync(f).filter((n) => n.endsWith('.pid')).map((n) => join(f, n)))
    .flatMap((file) => {
      const state = readState(file);
      return state !== null && state.project === project ? [{ file, socket: join(dirname(file), `${state.key}.sock`), state }] : [];
    });
}
