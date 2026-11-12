// stop-cache: git-guard's Stop verdict kept for the next Stop (W8.3; runtime-cost survey, section 4). Seven agents end sessions all day, and
// each Stop asked git about every branch and GitHub about its heads: 1.7 s a Stop, 7.7 s at the worst. What the look found
// (which branches GitHub lacks, how far the main checkout's trunk lags) is kept in the repo's git dir, under a key that is the
// remote URLs and every local branch tip, remote ref and worktree (git-files.mts `refsFingerprint`, read from files, no process)
// with the guards' own settings: a commit, a branch, a fetch, a checkout elsewhere or a changed remote makes a different key.
// Served for 60 s (guards.git.stopCacheMs; 0 looks every time). A push the hook saw (`forget`) drops it: a push by URL moves
// no local ref. A look that did not reach GitHub is never kept.
//   hitFor(root, cfg, now) -> { found, behind } | null          the kept look, when its key and age still hold
//   keep(root, cfg, look, now)                                   keeps a look that reached GitHub
//   forget(root)                                                 drops it
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import type { BranchOff } from './branches-ahead.mts';
import { gitDirsOf, refsFingerprint } from './git-files.mts';
import { shortHash } from './hash.mts';
import { readJson, toJson, writeJson } from './json.mts';
import { failed } from './remote-heads.mts';
import type { Failure, GitGuards } from './remote-heads.mts';
import type { LagVerdict } from './trunk-lag.mts';

const FILE = 'claude-packs-stop.json';
export const STOP_CACHE_MS = 60_000;

/** What one Stop looked at: the local branches GitHub lacks, and the main checkout's trunk against GitHub's. */
export interface StopLook { found: BranchOff[] | Failure | null; behind: LagVerdict | null }

interface Kept { key: string; at: number; look: StopLook }

/** The settings that change what a look finds; the look's own plumbing (a deadline, the clock) does not. */
const settingsOf = (cfg: GitGuards): string => toJson({ ...cfg, until: undefined, now: undefined, live: undefined, cachedOnly: undefined, stopCacheMs: undefined, stopLiveMs: undefined });

/** Where a look is kept and the key it is kept under, as the repo is at the moment this is asked: taken BEFORE a look, so a look
 *  that a ref moved during is kept under the key it began at, and is not served for the state after. */
export interface Slot { file: string; key: string }

export function slotOf(root: string, cfg: GitGuards): Slot | null {
  const dirs = gitDirsOf(root);
  return dirs ? { file: join(dirs.common, FILE), key: `${refsFingerprint(dirs)}:${shortHash(settingsOf(cfg), 12)}` } : null;
}

export function hitFor(slot: Slot | null, cfg: GitGuards, now: number): StopLook | null {
  const ttl = cfg.stopCacheMs ?? STOP_CACHE_MS;
  if (ttl <= 0 || !slot) return null;
  const kept = readJson<Kept>(slot.file);
  return kept && kept.key === slot.key && now - kept.at < ttl && now >= kept.at ? kept.look : null;
}

/** Keeps a look that reached GitHub and found the trunk in step. A failure is not kept, and neither is a lag: whether the main
 *  checkout may be touched depends on uncommitted work, which no ref shows, so a Stop that finds one looks again. */
export function keep(slot: Slot | null, cfg: GitGuards, look: StopLook, now: number): void {
  if (!slot || (cfg.stopCacheMs ?? STOP_CACHE_MS) <= 0 || failed(look.found) || look.behind) return;
  writeJson(slot.file, { key: slot.key, at: now, look } satisfies Kept);
}

export function forget(root: string): void {
  const dirs = gitDirsOf(root);
  if (dirs) rmSync(join(dirs.common, FILE), { force: true });
}
