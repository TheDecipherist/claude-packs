// The work orders running on this machine (1.7.3): every process running a kit runner, `bash docs/workorders/<order>/run.sh`,
// with the project it runs in (the process's working folder: /proc on Linux, lsof on macOS).
import { execFileSync } from 'node:child_process';
import { readFileSync, readlinkSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { slotOwners } from './build-slots.mjs';

const RUNNER = /\bdocs\/workorders\/([\w.-]+)\/run\.sh\b/;

function cwdOf(pid) {
  try { return readlinkSync(`/proc/${pid}/cwd`); } catch { /* not Linux: ask lsof */ }
  try {
    const out = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').find((l) => l.startsWith('n'))?.slice(1) ?? null;
  } catch { return null; }
}

/** Runner processes in `ps` output: [{ pid, order }]. */
export function runnersIn(psText) {
  return psText.split('\n').map((l) => l.trim().match(/^(\d+)\s+(.*)$/)).filter(Boolean)
    .map(([, pid, args]) => ({ pid: Number(pid), args }))
    .filter((p) => /\bbash\b/.test(p.args) && RUNNER.test(p.args) && !/\bclaude\b/.test(p.args))
    .map((p) => ({ pid: p.pid, order: p.args.match(RUNNER)[1] }));
}

/** Every process's working folder, CPU, resident memory and whether it is a build waiting for a slot of the build queue,
 *  [{ pid, cpu, rssKb, cwd, queued }]: /proc on Linux, one lsof call elsewhere; [] when neither works. */
function processes() {
  let ps = '';
  try { ps = execFileSync('ps', ['-eo', 'pid=,pcpu=,rss=,args='], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); } catch { return []; }
  const owners = slotOwners();
  const rows = ps.split('\n').map((l) => l.trim().match(/^(\d+)\s+([\d.]+)\s+(\d+)\s+(.*)$/)).filter(Boolean)
    .map(([, pid, cpu, rss, args]) => ({ pid: Number(pid), cpu: Number(cpu) || 0, rssKb: Number(rss) || 0,
      queued: /^node\s+\S*buildq\.mjs\s+(?!--status)/.test(args) && !owners.has(Number(pid)) }));
  let cwds = null;
  try {
    readlinkSync('/proc/self/cwd');
    cwds = new Map(rows.map((r) => { try { return [r.pid, readlinkSync(`/proc/${r.pid}/cwd`)]; } catch { return [r.pid, null]; } }));
  } catch {
    try {
      const out = execFileSync('lsof', ['-d', 'cwd', '-Fpn'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 });
      let pid = null;
      cwds = new Map();
      for (const l of out.split('\n')) { if (l[0] === 'p') pid = Number(l.slice(1)); else if (l[0] === 'n' && pid) cwds.set(pid, l.slice(1)); }
    } catch { return []; }
  }
  return rows.map((r) => ({ ...r, cwd: cwds.get(r.pid) ?? null })).filter((r) => r.cwd);
}

/** What runs inside each folder now, { [dir]: { procs, cores, memMb, queued } }, or null when this machine's processes
 *  cannot be read; queued: a build of it waits for a slot of the build queue. A process counts for the deepest folder it
 *  works in, so a worktree's build is its agent's and not its project's. */
export function workIn(dirs, all = processes()) {
  if (all.length === 0) return null;
  const sorted = [...dirs].sort((a, b) => b.length - a.length);
  const work = Object.fromEntries(dirs.map((d) => [d, { procs: 0, cores: 0, memMb: 0, queued: false }]));
  for (const p of all) {
    const dir = sorted.find((d) => p.cwd === d || p.cwd.startsWith(`${d}/`));
    if (!dir) continue;
    work[dir].procs += 1;
    work[dir].queued ||= Boolean(p.queued);
    work[dir].cores = Math.round((work[dir].cores + p.cpu / 100) * 10) / 10;
    work[dir].memMb = Math.round(work[dir].memMb + p.rssKb / 1024);
  }
  return work;
}

const lastTouched = (gitdir) => Math.max(0, ...['logs/HEAD', 'index', 'HEAD'].map((f) => { try { return statSync(join(gitdir, f)).mtimeMs; } catch { return 0; } }));

/** The agent worktrees of a project: [{ name, path, branch, touched }], `touched` when git last wrote its HEAD or index
 *  there (its checkout, a commit, an add). */
export function worktreesOf(project) {
  let out = '';
  try { out = execFileSync('git', ['-C', project, 'worktree', 'list', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return []; }
  return out.split('\n\n').map((block) => {
    const path = block.match(/^worktree (.+)$/m)?.[1];
    if (!path || !path.includes('/.claude/worktrees/')) return null;
    let gitdir = null;
    try { gitdir = readFileSync(join(path, '.git'), 'utf8').match(/^gitdir: (.+)$/m)?.[1]?.trim() ?? null; } catch { /* a removed worktree */ }
    return { name: basename(path), path, branch: block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? null, touched: gitdir ? lastTouched(gitdir) : 0 };
  }).filter(Boolean);
}

/** How many commits `branch` has that `base` lacks: 0 for a branch just made from it; null when either cannot be read. */
export function commitsAhead(project, branch, base) {
  try { return Number(execFileSync('git', ['-C', project, 'rev-list', '--count', `${base}..${branch}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()); } catch { return null; }
}

/** Whether `branch` is merged into `into`: every commit of it is there. False when either cannot be read. */
export function mergedInto(project, branch, into) {
  try { execFileSync('git', ['-C', project, 'merge-base', '--is-ancestor', branch, into], { stdio: 'ignore' }); return true; } catch { return false; }
}

/** The runs alive now: [{ project, order, pid }], one per project and order. */
export function runningOrders() {
  let ps = '';
  try { ps = execFileSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8' }); } catch { return []; }
  const runs = new Map();
  for (const r of runnersIn(ps)) {
    const project = cwdOf(r.pid);
    if (project) runs.set(`${project}\0${r.order}`, { project, order: r.order, pid: r.pid });
  }
  return [...runs.values()];
}
