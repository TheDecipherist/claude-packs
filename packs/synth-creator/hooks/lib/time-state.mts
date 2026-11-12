// time-guard's memory and its looks at the machine: the state kept between calls (in the caller's temp folder, outside the
// project), the worktrees' git status, who owns a worktree, and the scan of every worktree that runs in a process of its own
// (KWB-24: a synth's 125 worktrees took over a minute, so the hook never waits on it). Nothing here reads the process: the
// project, the environment and the time are the caller's.
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { gitRun } from './git-run.mts';
import { readJson, writeJson } from './json.mts';
import { LIMITS } from './time-findings.mts';
import type { Env } from './types.d.mts';

/** Where a call happens: the project's main folder, whether the call is inside one of its worktrees, the state folder and the environment. */
export interface Place { projectRoot: string; inWorktree: boolean; stateDir: string; env: Env }

export function placeOf(projectDir: string, env: Env): Place {
  const dir = resolve(projectDir);
  const projectRoot = dir.replace(/\/\.claude\/worktrees\/[^/]+(\/.*)?$/, '');
  return {
    projectRoot, inWorktree: dir !== projectRoot, env,
    stateDir: join(env['TMPDIR'] ?? tmpdir(), `time-guard-${basename(projectRoot).replace(/[^\w.-]/g, '-') || 'project'}`),
  };
}

/** What the guard remembers between calls, per agent and per worktree. */
export interface GuardState {
  starts?: Record<string, number>;                 // tool call id -> when it started
  looked?: number;                                 // when the machine was last looked at
  seen?: Record<string, number>;                   // agent -> when it last ran anything
  owner?: Record<string, string>;                  // worktree name -> the agent that works in it
  wt?: Record<string, string>;                     // agent -> its worktree's path
  wrote?: Record<string, Record<string, boolean>>; // agent -> worktree -> it has written there
  checked?: Record<string, number>;                // worktree -> when its git was last asked
  told?: Record<string, number>;                   // finding key -> when it was last said
  scanned?: number;
  lateTold?: number;
  lookTold?: number;                               // the last look (time-look.mts) whose findings were said
  [key: string]: unknown;
}

/** The background scan's finding: when it was made and the worktrees holding work unsaved for long. */
export interface Late { at: number; list: string[] }

export const loadState = ({ stateDir }: Place): GuardState => readJson<GuardState>(join(stateDir, 'state.json')) ?? {};
/** The guard never stops work by failing itself: a state that cannot be written is only lost. */
export function saveState({ stateDir }: Place, st: GuardState): void {
  try { mkdirSync(stateDir, { recursive: true }); writeJson(join(stateDir, 'state.json'), st); } catch { /* next time */ }
}
export const readLate = ({ stateDir }: Place): Late | null => readJson<Late>(join(stateDir, 'late.json'));

const GIT_WAIT_MS = 10_000;

/** Minutes since the last commit of the repo at `cwd`, or null when it has none. */
export function lastCommitMin(cwd: string, now: number, env: Env): number | null {
  const r = gitRun(['log', '-1', '--format=%ct'], { cwd, env, timeoutMs: GIT_WAIT_MS });
  const out = r.ok ? r.stdout.trim() : '';
  return out ? (now - Number(out)) / 60 : null;
}

/** Minutes since the OLDEST change not yet committed in a worktree (build folders left out); null when it is clean. */
export function unsavedMin(wt: string, now: number, env: Env): number | null {
  const r = gitRun(['--no-optional-locks', '-C', wt, 'status', '--porcelain', '--untracked-files=all'], { cwd: wt, env, timeoutMs: GIT_WAIT_MS });
  if (!r.ok) return null;
  let oldest: number | null = null;
  for (const line of r.stdout.split('\n')) {
    const f = line.slice(3).trim().replace(/^"|"$/g, '');
    if (!f || /^(build|listen\/|screenshots\/)/.test(f) || f.includes('/build')) continue;
    try { const t = statSync(join(wt, f)).mtimeMs / 1000; oldest = oldest === null ? t : Math.min(oldest, t); } catch { /* gone */ }
  }
  return oldest === null ? null : (now - oldest) / 60;
}

/** The project's agent worktrees (folders under .claude/worktrees that hold a .git). */
export function listWorktrees(projectRoot: string): string[] {
  const root = join(projectRoot, '.claude', 'worktrees');
  try {
    return readdirSync(root).sort().map((d) => join(root, d)).filter((d) => { try { statSync(join(d, '.git')); return true; } catch { return false; } });
  } catch { return []; }
}

/** Is this agent still running, by the cap hook's count? Unknown state counts as running (the safe side). */
export function agentRunning(aid: string, env: Env): boolean {
  const st = readJson<Record<string, { running?: Record<string, unknown>; known?: Record<string, unknown> } | null>>(join(env['HOME'] ?? homedir(), '.claude/agent-cap-state.json'));
  if (!st) return true;
  const sessions = Object.values(st).filter((s): s is { running?: Record<string, unknown>; known?: Record<string, unknown> } => Boolean(s) && typeof s === 'object');
  if (sessions.some((s) => aid in (s.running ?? {}))) return true;
  return !sessions.some((s) => aid in (s.known ?? {}));
}

/** What the controller tells of worktrees holding work unsaved for long. */
export const lateOf = (unsaved: Readonly<Record<string, number | null>>): string[] =>
  Object.entries(unsaved).filter((e): e is [string, number] => e[1] !== null && e[1] > LIMITS.save).map(([wt, u]) => `${wt.split('/').pop()} (${u.toFixed(0)} min)`);

/** The scan itself, run by `--scan-worktrees` in a process of its own: every worktree's unsaved age into late.json. */
export function scanNow(place: Place, now: number): number {
  const list = lateOf(Object.fromEntries(listWorktrees(place.projectRoot).map((wt) => [wt, unsavedMin(wt, now, place.env)])));
  try { mkdirSync(place.stateDir, { recursive: true }); writeJson(join(place.stateDir, 'late.json'), { at: now, list }); } catch { /* next time */ }
  return 0;
}

/** Starts the scan detached, so the event never waits on it; `self` is the hook's own file, run with `--scan-worktrees`. */
export function scanLater(place: Place, self: string): void {
  try { spawn(process.execPath, [self, '--scan-worktrees'], { cwd: place.projectRoot, detached: true, stdio: 'ignore', env: { ...place.env } }).unref(); } catch { /* next time */ }
}
