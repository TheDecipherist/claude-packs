// doctor and the running daemon (typescript order W8.4, review-2-go 6.4): doctor proves the hooks on disk while a daemon may still serve
// the ones it loaded before an `update`. It says so when the running daemon's kit hash is not the project's lock's (the next event
// starts a new one, the old one ends when idle), and which daemon is up otherwise.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { alive, daemonsOf, type DaemonHost } from '../packs/base/hooks/lib/daemon-find.mts';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { lockHash } from '../packs/base/hooks/lib/proxy-wire.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';

const hostOf = (env: Readonly<Record<string, string | undefined>>): DaemonHost =>
  ({ env, home: env.HOME || homedir(), platform: process.platform, uid: process.getuid?.() ?? 0 });

/** One note per live daemon of the project whose kit hash is not the lock's, naming both hashes. Never a problem: it ends when idle. */
export function daemonNotes(projectDir: string, env: Readonly<Record<string, string | undefined>>, log: Logger): string[] {
  const lock = lockHash(readText(join(projectDir, '.claude', 'claude-packs.lock.json')) ?? '');
  const old = daemonsOf(projectDir, hostOf(env)).filter((d) => alive(d.state.pid) && d.state.lockHash !== lock);
  for (const { state } of old) {
    log(`  note: the resident runner running now (pid ${state.pid}) has kit hash ${state.lockHash}, the project's lock is ${lock}: it serves the hooks it loaded before the last update, and ends when idle; the next event starts a new one`);
  }
  return old.map((d) => String(d.state.pid));
}
