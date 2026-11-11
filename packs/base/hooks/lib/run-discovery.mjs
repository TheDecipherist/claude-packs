// The work orders running on this machine (1.7.3): every process running a kit runner, `bash docs/workorders/<order>/run.sh`,
// with the project it runs in (the process's working folder: /proc on Linux, lsof on macOS).
import { execFileSync } from 'node:child_process';
import { readlinkSync } from 'node:fs';

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
