// PreToolUse (Agent, Task): a session with nobody there holds its agents in the foreground. A `claude -p` session ends when its
// lead ends its turn, and every agent it started in the background is stopped with it (KWB-124: a rebuild run's session
// launched four agents with run_in_background, ended its turn 15 minutes later, and all four were stopped mid-work, two with
// work uncommitted). Agents started in the foreground, all in one message, run side by side and the lead waits for them.
// Unattended means CLAUDE_PACKS_UNATTENDED=1 (a work order's run.sh sets it), or the nearest claude among the session's parent
// processes is a `claude -p` / `claude --print`. CLAUDE_PACKS_UNATTENDED=0 says someone is there, and the parents are not read.
// A judge on the hook contract (typescript order W4): the environment and the session's process come from the event's context
// (`ctx.env`, `ctx.sessionPid`), never from this process, so a resident runner reads its caller's, not its own.
import { spawnSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { basename, join } from 'node:path';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { put, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookContext, HookEvent, VerdictRow } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';
import { fileURLToPath } from 'node:url';

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

export const hook: Hook = (event, ctx) => {
  if (event.tool_name !== 'Agent' && event.tool_name !== 'Task') return pass;
  if (event.tool_input?.run_in_background !== true || !unattended(ctx)) return pass;
  return refuse(
    'BLOCKED by agents-held: this session runs with nobody there, and it ends when its turn ends: an agent started in the '
    + 'background is stopped with it, mid-work (KWB-124). Start the agent in the foreground (leave out run_in_background), '
    + 'and every independent agent in the same message, up to the project\'s agent limit: they run side by side.',
  );
};

/** A foreground agent passes in a worktree; the unattended refusal needs the environment said, which a case as data cannot set
 *  (worktree-cases-commands.mjs keeps that step). */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a foreground agent in the worktree', event: { tool_name: 'Agent', tool_input: { prompt: 'x', run_in_background: false }, cwd: '{wt}' }, want: 0 },
    { label: 'another tool in the worktree', event: { tool_name: 'Bash', tool_input: { command: 'ls', run_in_background: true }, cwd: '{wt}' }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'src/a.ts': 'a\n' });
  const agent = (input: Record<string, unknown>): HookEvent => ({ tool_name: 'Agent', tool_input: { description: 'W3 part', prompt: 'Read the brief.', ...input } });
  // the environment said in the event's context, as the runner builds it
  const as = (said: string, payload: HookEvent): number => {
    const ctx = contextOf({ projectDir: dir, cwd: dir, env: { CLAUDE_PROJECT_DIR: dir, CLAUDE_PACKS_UNATTENDED: said } });
    const verdict = hook(payload, ctx);
    return verdict instanceof Promise ? 1 : verdict.code;
  };
  // the parents read for real: the hook run by a stand-in `claude -p`, with nothing said in the environment
  put(join(dir, 'bin/claude'), `#!/bin/sh\n"${process.execPath}" "${hookFile}"\n`);
  chmodSync(join(dir, 'bin/claude'), 0o755);
  // an interactive session started from a print session (a run's lead started from a `claude -p`): its own parent decides (KWB-130)
  put(join(dir, 'outer/claude'), `#!/bin/sh\n"${join(dir, 'bin/claude')}" --resume x\n`);
  chmodSync(join(dir, 'outer/claude'), 0o755);
  const env: Record<string, string | undefined> = { ...contextOf().env, CLAUDE_PROJECT_DIR: dir };
  delete env['CLAUDE_PACKS_UNATTENDED'];
  const underPrint = (flag: string, bin = 'bin'): number | null => spawnSync('sh', ['-c', `"${join(dir, bin, 'claude')}" ${flag} x`], {
    cwd: dir, env, encoding: 'utf8', input: JSON.stringify(agent({ run_in_background: true })),
  }).status;
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const cases: VerdictRow[] = [
    ['a background agent under a claude -p parent', underPrint('-p'), 2],
    ['a background agent under an interactive claude parent', underPrint('--resume'), 0],
    ['an interactive claude under a claude -p: the nearer one decides', underPrint('-p', 'outer'), 0],
    ['a background agent in an unattended run', as('1', agent({ run_in_background: true })), 2],
    ['a background Task in an unattended run', as('1', { ...agent({ run_in_background: true }), tool_name: 'Task' }), 2],
    ['a foreground agent in an unattended run', as('1', agent({})), 0],
    ['an agent with run_in_background false', as('1', agent({ run_in_background: false })), 0],
    ['a background agent with someone there', as('0', agent({ run_in_background: true })), 0],
    ['another tool in an unattended run', as('1', { tool_name: 'Bash', tool_input: { command: 'ls', run_in_background: true } }), 0],
    ['claude -p is a print session', printSession('claude -p Run docs/workorders/rebuild/PROMPT.md --verbose'), true],
    ['claude --print by its path', printSession('/usr/local/bin/claude --print hi'), true],
    ['node running claude -p', printSession('node /home/u/.nvm/bin/claude -p x'), true],
    ['an interactive claude', printSession('claude --dangerously-skip-permissions --resume'), false],
    ['-p of another program', printSession('vim -p a b'), false],
    ['a judge writes no file (the write trap)', writtenSince(dir, before).join(','), ''],
  ];
  return verdicts('agents-held', cases);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'agents-held', hook, selftest);
