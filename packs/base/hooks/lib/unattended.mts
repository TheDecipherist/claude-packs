// Whether nobody is there: CLAUDE_PACKS_UNATTENDED=1 (a work order's run.sh sets it), or the nearest claude among the session's
// parent processes is a `claude -p` / `claude --print`; CLAUDE_PACKS_UNATTENDED=0 says someone is there, and the parents are not read.
// Moved out of agents-held so run-keeps-going asks the same question the same way (KWB-next).
import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';
import type { HookContext } from './types.d.mts';

const ANCESTORS = 8;

// The words after the claude command in a process's command line, or null when it runs no claude.
function claudeArgs(args: string): string[] | null {
  const words = args.trim().split(/\s+/).map((w) => w.replace(/^['"]|['"]$/g, ''));
  const at = words.findIndex((w) => basename(w) === 'claude');
  return at === -1 ? null : words.slice(at + 1);
}

/** A process's command line is a print session: the claude command with -p or --print among its words. */
export function printSession(args: string): boolean {
  return (claudeArgs(args) ?? []).some((w) => w === '-p' || w === '--print');
}

// The parent, and the command line, of one process, by ps (the same on Linux and macOS).
function parentOf(pid: number): { ppid: number; args: string } | null {
  const r = spawnSync('ps', ['-o', 'ppid=', '-o', 'args=', '-p', String(pid)], { encoding: 'utf8' });
  const m = r.status === 0 ? r.stdout.trim().match(/^(\d+)\s+(.*)$/) : null;
  return m ? { ppid: Number(m[1]), args: m[2] ?? '' } : null;
}

/** True when nobody is there: what the environment says, else what the session's own claude process is. */
export function unattended(ctx: Pick<HookContext, 'env' | 'sessionPid'>): boolean {
  const said = ctx.env['CLAUDE_PACKS_UNATTENDED'];
  if (said === '1' || said === '0') return said === '1';
  for (let pid = ctx.sessionPid, n = 0; pid > 1 && n < ANCESTORS; n += 1) {
    const p = parentOf(pid);
    if (!p) return false;
    // the nearest claude is the session that runs this hook; one further up is another session (KWB-130)
    if (claudeArgs(p.args)) return printSession(p.args);
    pid = p.ppid;
  }
  return false;
}
