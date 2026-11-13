// The work orders running on this machine (1.7.3): every process running a kit runner, `bash docs/workorders/<order>/run.sh`,
// with the project it runs in (the process's working folder: /proc on Linux, lsof on macOS), and every order a Claude Code
// session works on (run-claudes.mjs, KWB-161). The environment and the platform are the caller's to pass, never read here.
import { execFileSync } from 'node:child_process';
import { readFileSync, readlinkSync, realpathSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { inFlight, machineHost } from './governor.mts';
import { gitOut, gitRun } from './git-run.mts';
import { sessionOrders } from './run-claudes.mts';

/** The environment a caller passes. */
import type { Env } from './types.d.mts';
export type { Env };
/** A process of a runner of a work order. */
export interface Runner { pid: number; order: string }
/** One process, with the folder it works in. */
export interface Proc { pid: number; cpu: number; rssKb: number; cwd: string; queued: boolean }
/** What runs inside one folder now. */
export interface Work { procs: number; cores: number; memMb: number; queued: boolean }
/** An agent worktree of a project: `touched` is when git last wrote its HEAD or index there. */
export interface Worktree { name: string; path: string; branch: string | null; touched: number }
/** A run alive now. */
export interface Run { project: string; order: string; pid: number }
export interface RunningOrdersInput {
  /** The caller's environment (git, ps and lsof run with it). */
  env: Env;
  /** `process.platform`, said by the caller. */
  platform: string;
  /** What could not be looked at goes here (Windows' sessions). */
  notes?: string[];
  nowMs?: number;
}

const RUNNER = /\bdocs\/workorders\/([\w.-]+)\/run\.sh\b/;
const BIG = 32 * 1024 * 1024;

function cwdOf(pid: number, env: Env): string | null {
  try { return readlinkSync(`/proc/${pid}/cwd`); } catch { /* not Linux: ask lsof */ }
  try {
    const out = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...env } });
    return out.split('\n').find((l) => l.startsWith('n'))?.slice(1) ?? null;
  } catch { return null; }
}

/** Runner processes in `ps` output: [{ pid, order }]. */
export function runnersIn(psText: string): Runner[] {
  return psText.split('\n').flatMap((line): Runner[] => {
    const m = line.trim().match(/^(\d+)\s+(.*)$/);
    const pid = m?.[1];
    const args = m?.[2];
    if (pid === undefined || args === undefined || !/\bbash\b/.test(args) || /\bclaude\b/.test(args)) return [];
    const order = args.match(RUNNER)?.[1];
    return order === undefined ? [] : [{ pid: Number(pid), order }];
  });
}

/** Whether a process's command line is a resident runner serving a project (`node .../resident.mjs --serve <project> ...`). */
export const isDaemon = (args: string): boolean => /\bresident\.m?[jt]s\s+--serve\b/.test(args);

/** Every process's working folder, CPU, resident memory and whether it is a build waiting for the governor's grant:
 *  /proc on Linux, one lsof call elsewhere; [] when neither works. */
export function processesOf(env: Env): Proc[] {
  let ps = '';
  try { ps = execFileSync('ps', ['-eo', 'pid=,pcpu=,rss=,args='], { encoding: 'utf8', maxBuffer: BIG, env: { ...env } }); } catch { return []; }
  const owners = new Set(inFlight(machineHost(env)).jobs.map((j) => j.pid));   // W8.8: a buildq job holds a governor grant once it runs
  const rows = ps.split('\n').flatMap((l) => {
    const m = l.trim().match(/^(\d+)\s+([\d.]+)\s+(\d+)\s+(.*)$/);
    if (!m) return [];
    const pid = Number(m[1]);
    if (isDaemon(m[4] ?? '')) return [];   // the resident runner's own process is the kit's, no agent's work (W8.4)
    return [{ pid, cpu: Number(m[2]) || 0, rssKb: Number(m[3]) || 0, queued: /^node\s+\S*buildq\.mjs\s+(?!--status)/.test(m[4] ?? '') && !owners.has(pid) }];
  });
  let cwds: Map<number, string | null>;
  try {
    readlinkSync('/proc/self/cwd');
    cwds = new Map(rows.map((r) => { try { return [r.pid, readlinkSync(`/proc/${r.pid}/cwd`)]; } catch { return [r.pid, null]; } }));
  } catch {
    try {
      const out = execFileSync('lsof', ['-d', 'cwd', '-Fpn'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: BIG, env: { ...env } });
      let pid: number | null = null;
      cwds = new Map();
      for (const l of out.split('\n')) { if (l[0] === 'p') pid = Number(l.slice(1)); else if (l[0] === 'n' && pid) cwds.set(pid, l.slice(1)); }
    } catch { return []; }
  }
  return rows.flatMap((r) => { const cwd = cwds.get(r.pid); return cwd ? [{ ...r, cwd }] : []; });
}

/** What runs inside each folder now, { [dir]: { procs, cores, memMb, queued } }, or null when this machine's processes
 *  cannot be read (`all`, from processesOf, is empty); queued: a build of it waits for a slot of the build queue. A process
 *  counts for the deepest folder it works in, so a worktree's build is its agent's and not its project's. */
export function workIn(dirs: readonly string[], all: readonly Proc[]): Record<string, Work> | null {
  if (all.length === 0) return null;
  const sorted = [...dirs].sort((a, b) => b.length - a.length);
  const work: Record<string, Work> = Object.fromEntries(dirs.map((d) => [d, { procs: 0, cores: 0, memMb: 0, queued: false }]));
  for (const p of all) {
    const dir = sorted.find((d) => p.cwd === d || p.cwd.startsWith(`${d}/`));
    const w = dir === undefined ? undefined : work[dir];
    if (!w) continue;
    w.procs += 1;
    w.queued ||= Boolean(p.queued);
    w.cores = Math.round((w.cores + p.cpu / 100) * 10) / 10;
    w.memMb = Math.round(w.memMb + p.rssKb / 1024);
  }
  return work;
}

const lastTouched = (gitdir: string): number => Math.max(0, ...['logs/HEAD', 'index', 'HEAD'].map((f) => { try { return statSync(join(gitdir, f)).mtimeMs; } catch { return 0; } }));

/** The agent worktrees of a project, `touched` when git last wrote its HEAD or index there (its checkout, a commit, an add). */
export function worktreesOf(project: string, env: Env): Worktree[] {
  const out = gitOut(['worktree', 'list', '--porcelain'], { cwd: project, env });
  if (out === null) return [];
  return out.split('\n\n').flatMap((block): Worktree[] => {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    if (!path || !path.includes('/.claude/worktrees/')) return [];
    let gitdir: string | null = null;
    try { gitdir = readFileSync(join(path, '.git'), 'utf8').match(/^gitdir: (.+)$/m)?.[1]?.trim() ?? null; } catch { /* a removed worktree */ }
    return [{ name: basename(path), path, branch: block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? null, touched: gitdir ? lastTouched(gitdir) : 0 }];
  });
}

const realOf = (p: string): string => { try { return realpathSync(p); } catch { return resolve(p); } };

/** The worktrees an order's agents work in: those directly under the project's own .claude/worktrees. Never the project itself,
 *  its sibling worktrees, or another run's agents nested one level further (KWB-next: a run whose project is a worktree, the
 *  audit order in claude-packs/.claude/worktrees/audit, listed its own lead as an agent, "audit > no status file yet"). */
export function agentTreesOf(project: string, env: Env): Worktree[] {
  const own = `${realOf(project)}/.claude/worktrees/`;
  return worktreesOf(project, env).filter((t) => { const p = realOf(t.path); return p.startsWith(own) && !p.slice(own.length).includes('/'); });
}

/** How many commits `branch` has that `base` lacks: 0 for a branch just made from it; null when either cannot be read. */
export function commitsAhead(project: string, branch: string, base: string, env: Env): number | null {
  const out = gitOut(['rev-list', '--count', `${base}..${branch}`], { cwd: project, env });
  return out === null ? null : Number(out);
}

/** Whether `branch` is merged into `into`: every commit of it is there. False when either cannot be read. */
export function mergedInto(project: string, branch: string, into: string, env: Env): boolean {
  return gitRun(['merge-base', '--is-ancestor', branch, into], { cwd: project, env }).ok;
}

/** The runs alive now: [{ project, order, pid }], one per project and order, whichever way it was found: a run.sh process, or
 *  a Claude Code session working on the order (KWB-161). What could not be looked at goes into `notes` (Windows' sessions). */
export function runningOrders({ env, platform, notes = [], nowMs = Date.now() }: RunningOrdersInput): Run[] {
  let ps = '';
  try { ps = execFileSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8', maxBuffer: BIG, env: { ...env } }); } catch { /* no ps (Windows): no runner found; the sessions say why */ }
  const runs = new Map<string, Run>();
  for (const r of runnersIn(ps)) {
    const project = cwdOf(r.pid, env);
    if (project) runs.set(`${project}\0${r.order}`, { project, order: r.order, pid: r.pid });
  }
  const sessions = sessionOrders({ ps, platform, nowMs, trees: (project) => worktreesOf(project, env) });
  if (sessions.unsupported) notes.push(sessions.unsupported);
  for (const r of sessions.runs) if (!runs.has(`${r.project}\0${r.order}`)) runs.set(`${r.project}\0${r.order}`, r);
  return [...runs.values()];
}
