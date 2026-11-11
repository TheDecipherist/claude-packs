// own-processes: which processes on the machine this session started (KWB-87). A hook runs below its session's own `claude`
// process, so a process is the session's when that process is among its ancestors. Anything else (another session, the runner
// that started this session, a loop left running under nohup) is that one's own guard's to judge, never this one's.
//   etimeS(ps etime) -> seconds
//   processTable() -> [{ pid, ppid, age, cmd }]   (age in seconds; [] when ps cannot be read)
//   sessionPid(rows, from) -> the nearest ancestor that is a claude process, or null; `from` is the caller's parent pid
//   descendants(rows, root) -> Set of the pids below root
//   ownProcesses(rows, from) -> descendants of the session, or null when no session is found (the caller judges every process)
import { execFileSync } from 'node:child_process';

export interface ProcessRow { pid: number; ppid: number; age: number; cmd: string }

export function etimeS(s: string): number {
  const t = s.trim();
  const dash = t.lastIndexOf('-');
  const days = dash >= 0 ? Number(t.slice(0, dash)) : 0;
  const parts = (dash >= 0 ? t.slice(dash + 1) : t).split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return days * 86400 + (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
}

export function processTable(): ProcessRow[] {
  let out = '';
  try { out = execFileSync('ps', ['-axo', 'pid=,ppid=,etime=,command='], { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return []; }
  const rows: ProcessRow[] = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if (m) rows.push({ pid: Number(m[1]), ppid: Number(m[2]), age: etimeS(m[3] ?? ''), cmd: m[4] ?? '' });
  }
  return rows;
}

const CLAUDE = /^(?:\S*\/)?claude(?:\s|$)|@anthropic-ai\/claude-code\//;

export function sessionPid(rows: readonly ProcessRow[], from: number): number | null {
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  for (let p = from, hops = 0; p > 1 && hops < 64; hops += 1) {
    const r = byPid.get(p);
    if (!r) return null;
    if (CLAUDE.test(r.cmd)) return p;
    p = r.ppid;
  }
  return null;
}

export function descendants(rows: readonly ProcessRow[], root: number): Set<number> {
  const kids = new Map<number, number[]>();
  for (const r of rows) kids.set(r.ppid, [...(kids.get(r.ppid) ?? []), r.pid]);
  const found = new Set<number>();
  const stack = [root];
  for (let at = stack.pop(); at !== undefined; at = stack.pop()) for (const k of kids.get(at) ?? []) if (!found.has(k)) { found.add(k); stack.push(k); }
  return found;
}

export function ownProcesses(rows: readonly ProcessRow[], from: number): Set<number> | null {
  const session = sessionPid(rows, from);
  return session === null ? null : descendants(rows, session);
}
