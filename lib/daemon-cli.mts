// `claude-packs daemon status|stop`: the resident runner of a project, found by its pid file (typescript order W8.2, review-2-go 3.10).
// A project can have more than one (an old kit version's, until it is idle); status lists each with its age, kit hash, events and
// memory, and says when its kit is not the one the project's lock names now; stop ends each of them.
import { rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { alive, daemonsOf, type DaemonHost } from '../packs/base/hooks/lib/daemon-find.mts';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { real } from '../packs/base/hooks/lib/project.mts';
import { lockHash } from '../packs/base/hooks/lib/proxy-wire.mts';
import type { Logger } from '../packs/base/hooks/lib/types.d.mts';

export type { DaemonHost };
const here = (): DaemonHost => ({ env: process.env, home: homedir(), platform: process.platform, uid: process.getuid?.() ?? 0 });

const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

const age = (ms: number): string => (ms < 90_000 ? `${Math.round(ms / 1000)} s` : ms < 5_400_000 ? `${Math.round(ms / 60_000)} min` : `${(ms / 3_600_000).toFixed(1)} h`);

/** status: one block per daemon, or a line saying there is none. Returns 0. */
function status(dir: string, host: DaemonHost, log: Logger): number {
  const found = daemonsOf(dir, host);
  const lock = lockHash(readText(join(real(dir), '.claude', 'claude-packs.lock.json')) ?? '');
  if (found.length === 0) { log(`no resident runner for ${real(dir)}`); return 0; }
  for (const { state } of found) {
    const up = alive(state.pid);
    log(`${up ? 'running' : 'dead (stale pid file)'}  pid ${state.pid}  up ${age(Date.now() - state.started)}  events ${state.events}  workers ${state.workers}  rss ${Math.round(state.rss / 1048576)} MB`);
    log(`  kit hash ${state.lockHash}${state.lockHash === lock ? '' : `  (the project's lock is ${lock}: this one is an old kit's and ends when idle)`}  hooks ${state.hooks}`);
  }
  return 0;
}

/** stop: SIGTERM each live daemon of the project and wait for it; the pid file of a dead one is removed. Returns 0, or 1 if one would not stop. */
async function stop(dir: string, host: DaemonHost, log: Logger): Promise<number> {
  const found = daemonsOf(dir, host);
  if (found.length === 0) { log(`no resident runner for ${real(dir)}`); return 0; }
  let stuck = 0;
  for (const { file, state } of found) {
    if (alive(state.pid)) {
      try { process.kill(state.pid, 'SIGTERM'); } catch { /* gone */ }
      for (let i = 0; i < 100 && alive(state.pid); i += 1) await wait(50);
    }
    if (alive(state.pid)) { stuck += 1; log(`pid ${state.pid} did not stop`); } else { rmSync(file, { force: true }); log(`stopped pid ${state.pid}`); }
  }
  return stuck === 0 ? 0 : 1;
}

export async function daemonCommand(dir: string, rest: readonly string[], log: Logger, host: DaemonHost = here()): Promise<number> {
  if (rest[0] === 'status') return status(dir, host, log);
  if (rest[0] === 'stop') return stop(dir, host, log);
  throw new Error('use `daemon status` or `daemon stop`');
}
