// The status line and the resident runner (typescript order W8.4, review-2-go 7.1): the bar asks the daemon's socket whether it is
// there, with a 50 ms deadline. It never starts a daemon (only a hook event does), and its ask is no event: the daemon answers it
// with its own state and leaves its idle clock alone, so a bar drawn every five seconds never keeps a daemon alive. With the daemon
// down the bar draws from its own files as always and says so, so the user sees the kit is not resident.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { alive, daemonsOf } from '../hooks/lib/daemon-find.mjs';
import { readText } from '../hooks/lib/files.mjs';
import { askDaemon } from '../hooks/lib/proxy-client.mjs';
import { PROTOCOL, lockHash } from '../hooks/lib/proxy-wire.mjs';
/** What the bar says when no daemon serves the project's hooks. */
export const SLOW_PATH = 'hooks: slow path';
/** The longest the bar waits for the daemon's answer. */
export const ASK_MS = 50;
/** Whether the project's hooks are served by a live daemon of the lock's kit; `ms` bounds the socket ask. */
export async function residentState(project, env, ms = ASK_MS) {
    if (project === undefined || project === '' || env.CLAUDE_PACKS_DAEMON === 'off' || !existsSync(join(project, '.claude', 'hooks', 'bin', 'hook-proxy')))
        return 'unused';
    const lock = lockHash(readText(join(project, '.claude', 'claude-packs.lock.json')) ?? '');
    const host = { env, home: env.HOME || homedir(), platform: process.platform, uid: process.getuid?.() ?? 0 };
    const mine = daemonsOf(project, host).find((d) => d.state.lockHash === lock && alive(d.state.pid));
    if (mine === undefined)
        return 'down';
    const asked = await askDaemon(mine.socket, { v: PROTOCOL, env: {}, cwd: project, ppid: process.pid, deadline: Date.now() + ms, status: true }, '', ms);
    return asked.kind === 'reply' && asked.reply.code === 0 ? 'up' : 'down';
}
/** The bar's words for a daemon that is not there: the marker, or nothing. */
export const residentSegment = (state, paint, c) => (state === 'down' ? paint(SLOW_PATH, c.amber) : '');
