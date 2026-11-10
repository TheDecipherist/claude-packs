// own-processes: which processes on the machine this session started (KWB-87). A hook runs below its session's own `claude`
// process, so a process is the session's when that process is among its ancestors. Anything else (another session, the runner
// that started this session, a loop left running under nohup) is that one's own guard's to judge, never this one's.
//   etimeS(ps etime) -> seconds
//   processTable() -> [{ pid, ppid, age, cmd }]   (age in seconds; [] when ps cannot be read)
//   sessionPid(rows, from = process.ppid) -> the nearest ancestor that is a claude process, or null
//   descendants(rows, root) -> Set of the pids below root
//   ownProcesses(rows, from) -> descendants of the session, or null when no session is found (the caller judges every process)
import { execFileSync } from 'node:child_process';

export function etimeS(s) {
  const t = s.trim();
  const dash = t.lastIndexOf('-');
  const days = dash >= 0 ? Number(t.slice(0, dash)) : 0;
  const parts = (dash >= 0 ? t.slice(dash + 1) : t).split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return days * 86400 + parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function processTable() {
  let out = '';
  try { out = execFileSync('ps', ['-axo', 'pid=,ppid=,etime=,command='], { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return []; }
  return out.split('\n').map((l) => l.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/)).filter(Boolean)
    .map((m) => ({ pid: Number(m[1]), ppid: Number(m[2]), age: etimeS(m[3]), cmd: m[4] }));
}

const CLAUDE = /^(?:\S*\/)?claude(?:\s|$)|@anthropic-ai\/claude-code\//;

export function sessionPid(rows, from = process.ppid) {
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  for (let p = from, hops = 0; p > 1 && hops < 64; hops += 1) {
    const r = byPid.get(p);
    if (!r) return null;
    if (CLAUDE.test(r.cmd)) return p;
    p = r.ppid;
  }
  return null;
}

export function descendants(rows, root) {
  const kids = new Map();
  for (const r of rows) { if (!kids.has(r.ppid)) kids.set(r.ppid, []); kids.get(r.ppid).push(r.pid); }
  const found = new Set();
  const stack = [root];
  while (stack.length) for (const k of kids.get(stack.pop()) ?? []) if (!found.has(k)) { found.add(k); stack.push(k); }
  return found;
}

export function ownProcesses(rows, from = process.ppid) {
  const session = sessionPid(rows, from);
  return session === null ? null : descendants(rows, session);
}
