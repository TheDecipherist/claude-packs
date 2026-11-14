// Stop: a session with nobody there ends when its lead ends its turn, and every agent it started in the background is stopped
// with it (KWB-124: a rebuild run's session launched four agents with run_in_background, ended its turn 15 minutes later, and all
// four were stopped mid-work, two with work uncommitted). A background agent lives as long as the turn is open, and its completion
// reaches the lead at its next tool-call boundary (KWB-199, build/evidence/KWB-199/summary.md), so a background start passes and
// the end of the turn is what is refused while an agent this session started in the background has not returned. The session's
// transcript says which (lib/background-agents.mts). The refusal repeats while any is pending, also when the Stop hook is already
// active: a turn never ends on a pending agent.
// Unattended means CLAUDE_PACKS_UNATTENDED=1 (a work order's run.sh sets it), or the nearest claude among the session's parent
// processes is a `claude -p` / `claude --print`. CLAUDE_PACKS_UNATTENDED=0 says someone is there, and the parents are not read.
// A judge on the hook contract (typescript order W4): the environment and the session's process come from the event's context
// (`ctx.env`, `ctx.sessionPid`), never from this process, so a resident runner reads its caller's, not its own.
import { spawnSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { join } from 'node:path';
import { pendingIn } from './lib/background-agents.mts';
import { printSession, unattended } from './lib/unattended.mts';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { put, scratchProject, snapshot, verdicts, writtenSince } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookEvent, VerdictRow } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';
import { fileURLToPath } from 'node:url';

export const hook: Hook = (event, ctx) => {
  if (event.hook_event_name !== 'Stop') return pass;
  const pending = pendingIn(event.transcript_path);
  if (!pending.length || !unattended(ctx)) return pass;
  return refuse(
    'BLOCKED by agents-held: this session runs with nobody there, and it ends when its turn ends: an agent still running in the '
    + 'background is stopped with it, mid-work (KWB-124). Still running: ' + pending.map((a) => `"${a.description}"`).join(', ')
    + '. Keep working with short calls of your own (merge, read, start the next item) until each one\'s notification arrives, '
    + 'or wait for them in the foreground; end the turn when none is left.',
  );
};

/** A Stop with nothing pending passes in a worktree; the unattended refusal needs the environment said, which a case as data
 *  cannot set (worktree-cases-commands.mjs keeps that step). */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/done.jsonl': `${JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'w1', name: 'Agent', input: { run_in_background: false } }] } })}\n` },
  steps: [
    { label: 'a Stop with only a foreground agent in the worktree', event: { hook_event_name: 'Stop', transcript_path: '{wt}/done.jsonl', cwd: '{wt}' }, want: 0 },
    { label: 'a background start in the worktree', event: { tool_name: 'Agent', tool_input: { prompt: 'x', run_in_background: true }, cwd: '{wt}' }, want: 0 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'src/a.ts': 'a\n' });
  const agent = (input: Record<string, unknown>): HookEvent => ({ hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { description: 'W3 part', prompt: 'Read the brief.', ...input } });
  // a transcript line: a launch, its acknowledgement and a return, as Claude Code writes them (lib/background-agents.mts)
  const launch = (id: string, background: boolean, tool = 'Agent'): string => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: tool, input: { description: `part ${id}`, run_in_background: background, prompt: 'x' } }] } });
  const ack = (id: string): string => JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text: 'Async agent launched successfully.' }] }] } });
  const back = (id: string): string => JSON.stringify({ type: 'queue-operation', content: `<task-notification>\n<tool-use-id>${id}</tool-use-id>\n<status>completed</status>\n</task-notification>` });
  const transcript = (name: string, ...lines: string[]): string => { const f = join(dir, name); put(f, `${lines.join('\n')}\n`); return f; };
  const pendingFile = transcript('pending.jsonl', launch('t1', true), ack('t1'));
  const stop = (file: string, extra: Record<string, unknown> = {}): HookEvent => ({ hook_event_name: 'Stop', transcript_path: file, ...extra });
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
    cwd: dir, env, encoding: 'utf8', input: JSON.stringify(stop(pendingFile)),
  }).status;
  const t1 = transcript('task.jsonl', launch('t2', true, 'Task'));
  const t2 = transcript('two.jsonl', launch('a', true), ack('a'), launch('b', true), ack('b'), back('a'));
  const t3 = transcript('done.jsonl', launch('t3', true), ack('t3'), back('t3'));
  const t4 = transcript('result.jsonl', launch('t4', true), JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't4', content: 'DONE' }] } }));
  const t5 = transcript('fg.jsonl', launch('t5', false));
  const before = snapshot(dir);   // the project as the judge finds it: the rows below must leave it as it is
  const cases: VerdictRow[] = [
    ['a pending background agent at Stop under a claude -p parent', underPrint('-p'), 2],
    ['a pending background agent at Stop under an interactive claude parent', underPrint('--resume'), 0],
    ['an interactive claude under a claude -p: the nearer one decides', underPrint('-p', 'outer'), 0],
    ['a pending background agent at Stop in an unattended run', as('1', stop(pendingFile)), 2],
    ['a pending background Task at Stop in an unattended run', as('1', stop(t1)), 2],
    ['the same with the Stop hook already active: never ends on a pending agent', as('1', stop(pendingFile, { stop_hook_active: true })), 2],
    ['one returned, one still pending', as('1', stop(t2)), 2],
    ['a returned background agent at Stop', as('1', stop(t3)), 0],
    ['a background agent whose result came back', as('1', stop(t4)), 0],
    ['a foreground agent never counts', as('1', stop(t5)), 0],
    ['no transcript to read', as('1', stop(join(dir, 'missing.jsonl'))), 0],
    ['a pending background agent with someone there', as('0', stop(pendingFile)), 0],
    ['a background start in an unattended run passes', as('1', agent({ run_in_background: true })), 0],
    ['a background Task start in an unattended run passes', as('1', { ...agent({ run_in_background: true }), tool_name: 'Task' }), 0],
    ['a foreground agent in an unattended run', as('1', agent({})), 0],
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
