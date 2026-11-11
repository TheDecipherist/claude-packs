// Runs found by what they do (KWB-161). A work order driven from a Claude Code session (`claude -p`, the CLI, the VS Code
// extension's own `claude` binary) has no run.sh process, so the status line and `claude-packs status` never saw it or its
// agents. Every Claude Code process is a candidate: its working folder gives the project (a folder inside
// .claude/worktrees/<name> gives that worktree's main checkout), and there an order runs when it has no DONE file and its
// status.json or progress.md changed within the hour, or a worktree on a work/<order>-* branch was touched within it.
//   claudesIn(psText) -> [pid]                         sessionOrders({ ps, cwds, platform, nowMs, trees }) -> { runs, unsupported? }
//   cwdsOf(pids, platform) -> Map | null (Windows)     projectOf(dir) -> the project folder | null
//   liveOrdersIn(project, nowMs, trees) -> [order]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readlinkSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const LIVE_MS = 60 * 60 * 1000;
export const UNSUPPORTED = 'finding a run by its Claude Code session is not supported on Windows yet: only run.sh runs are found';
const MAX_UP = 8;   // folders walked up from a session's working folder to its project
const LSOF_TIMEOUT_MS = 5000;

const nameOf = (word) => word.split(/[\\/]/).pop();
/** a Claude Code program: the `claude` binary by any path, or node running the claude-code CLI */
const isClaude = ([prog, script = '']) => nameOf(prog) === 'claude' ||
  (nameOf(prog) === 'node' && (nameOf(script) === 'claude' || /claude-code[\\/]cli\.js$/.test(script)));

export function claudesIn(psText) {
  return psText.split('\n').map((l) => l.trim().match(/^(\d+)\s+(.*)$/)).filter(Boolean)
    .filter(([, , args]) => isClaude(args.split(/\s+/))).map(([, pid]) => Number(pid));
}

/** each pid's working folder: Linux from /proc, macOS from one lsof call for these pids only; null where neither is asked (Windows) */
export function cwdsOf(pids, platform = process.platform) {
  if (platform === 'win32') return null;
  if (!pids.length) return new Map();
  if (platform === 'linux') return new Map(pids.map((p) => { try { return [p, readlinkSync(`/proc/${p}/cwd`)]; } catch { return [p, null]; } }));
  let out = '';
  try {
    out = execFileSync('lsof', ['-a', '-d', 'cwd', '-Fpn', '-p', pids.join(',')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: LSOF_TIMEOUT_MS });
  } catch (e) { out = e.stdout ?? ''; }   // lsof exits 1 when one pid has gone; the others are still printed
  const found = new Map();
  let pid = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1));
    else if (line.startsWith('n') && pid !== null) found.set(pid, line.slice(1));
  }
  return found;
}

export function projectOf(dir, exists = existsSync) {
  const path = dir.replace(/\\/g, '/');
  const at = path.indexOf('/.claude/worktrees/');
  let d = at >= 0 ? path.slice(0, at) : path;
  for (let i = 0; i < MAX_UP; i += 1) {
    if (exists(join(d, 'docs', 'workorders'))) return d;
    const up = dirname(d);
    if (up === d) return null;
    d = up;
  }
  return null;
}

const mtimeOf = (file) => { try { return statSync(file).mtimeMs; } catch { return 0; } };

export function liveOrdersIn(project, nowMs = Date.now(), trees = () => []) {
  let orders = [];
  try { orders = readdirSync(join(project, 'docs', 'workorders'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { return []; }
  let worktrees = null;
  const touched = (order) => (worktrees ??= trees()).some((t) => t.branch?.startsWith(`work/${order}-`) && nowMs - t.touched < LIVE_MS);
  return orders.filter((order) => {
    const folder = join(project, 'docs', 'workorders', order);
    if (existsSync(join(folder, 'DONE'))) return false;
    return ['status.json', 'progress.md'].some((f) => nowMs - mtimeOf(join(folder, f)) < LIVE_MS) || touched(order);
  });
}

/** The runs found through Claude Code processes: { runs: [{ project, order, pid }] }, with `unsupported` on Windows. `trees(project)`
 *  lists a project's agent worktrees ({ branch, touched }); run-discovery passes its worktreesOf. */
export function sessionOrders({ ps = '', cwds = cwdsOf, platform = process.platform, nowMs = Date.now(), trees = () => [] } = {}) {
  const pids = claudesIn(ps);
  const where = cwds(pids, platform);
  if (where === null) return { runs: [], unsupported: UNSUPPORTED };
  const runs = [];
  const seen = new Set();
  for (const pid of pids) {
    const project = where.get(pid) ? projectOf(where.get(pid)) : null;
    if (!project || seen.has(project)) continue;
    seen.add(project);
    for (const order of liveOrdersIn(project, nowMs, () => trees(project))) runs.push({ project, order, pid });
  }
  return { runs };
}
