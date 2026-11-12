// What the soak does to the running daemon and what it checks afterwards (typescript order W10b items 1 and 2): a kit update (a new lock),
// `kill -9` of the daemon, one worker ended, the sampler killed, the daemon stopped, and the list of what a stopped run left behind.
// Each action returns what it saw; scripts/soak.mts writes it into the evidence.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { alive } from '../packs/base/hooks/lib/daemon-find.mts';
import { readJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import { lockHash } from '../packs/base/hooks/lib/proxy-wire.mts';
import { WIRE } from '../packs/base/hooks/lib/proxy-wire-table.mts';
import { CLI, KIT } from './replay-lib.mts';
import { processTable } from '../packs/base/hooks/lib/own-processes.mts';
import { cacheCounts, hostOf, newestDaemon } from './soak-probe.mts';

export interface Rig { root: string; dir: string; cache: string }
const POLL_MS = 1000;

export const envOf = (rig: Rig): NodeJS.ProcessEnv => ({ ...process.env, CLAUDE_PACKS_CACHE: rig.cache, CLAUDE_PROJECT_DIR: rig.dir });
const lockFile = (rig: Rig): string => join(rig.dir, WIRE.lockFile);
export const lockHashOf = (rig: Rig): string => lockHash(readFileSync(lockFile(rig), 'utf8'));

/** A kit update on the project: `update` as a user runs it; when that leaves the lock as it was, a field of the lock changes (the lock is
 *  what names a daemon), and it says so. Returns the hashes. */
export function kitUpdate(rig: Rig): { before: string; after: string; viaUpdate: boolean } {
  const before = lockHashOf(rig);
  spawnSync('node', [CLI, 'update', '--dir', rig.dir], { cwd: KIT, env: envOf(rig), encoding: 'utf8' });
  let after = lockHashOf(rig);
  const viaUpdate = after !== before;
  if (!viaUpdate) {
    const lock = readJson<Record<string, unknown>>(lockFile(rig), {}) ?? {};
    writeJson(lockFile(rig), { ...lock, soakUpdate: Date.now() });
    after = lockHashOf(rig);
  }
  return { before, after, viaUpdate };
}

/** Seconds until `pid` is gone (polled), or null after `maxMs`. */
export async function goneAfter(pid: number, maxMs: number): Promise<number | null> {
  const t = Date.now();
  while (Date.now() - t < maxMs) {
    if (!alive(pid)) return Math.round((Date.now() - t) / 100) / 10;
    await sleep(POLL_MS);
  }
  return null;
}

/** `kill -9` of the newest daemon: its pid and its sampler's. */
export function killDaemon(rig: Rig): { pid: number; sampler: number | null } | null {
  const d = newestDaemon(hostOf(rig.cache), rig.dir);
  if (d === null) return null;
  process.kill(d.found.state.pid, 'SIGKILL');
  return { pid: d.found.state.pid, sampler: d.found.state.sampler ?? null };
}

/** Ends the daemon through `daemon stop` as a user does; the text it printed. */
export function stopDaemons(rig: Rig): string {
  const r = spawnSync('node', [CLI, 'daemon', 'stop', '--dir', rig.dir], { cwd: KIT, env: envOf(rig), encoding: 'utf8' });
  return `${r.stdout}${r.stderr}`.trim();
}

/** Processes below the scratch root's name (a daemon, a worker's process, a sampler, a hook child) and daemon files left in the cache. */
export function leftBehind(rig: Rig, keys: ReadonlySet<string>): string[] {
  const procs = processTable().filter((p) => p.cmd.includes(rig.root) && !p.cmd.includes('scripts/soak')).map((p) => `process ${p.pid}: ${p.cmd.slice(0, 120)}`);
  const files = Object.entries(cacheCounts(hostOf(rig.cache), keys)).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`);
  return [...procs, ...files];
}
