#!/usr/bin/env node
// PreToolUse (Agent, Task): a session with nobody there holds its agents in the foreground. A `claude -p` session ends when its
// lead ends its turn, and every agent it started in the background is stopped with it (KWB-124: a rebuild run's session
// launched four agents with run_in_background, ended its turn 15 minutes later, and all four were stopped mid-work, two with
// work uncommitted). Agents started in the foreground, all in one message, run side by side and the lead waits for them.
// Unattended means CLAUDE_PACKS_UNATTENDED=1 (a work order's run.sh sets it), or the nearest claude among the hook's parent
// processes is a `claude -p` / `claude --print`. CLAUDE_PACKS_UNATTENDED=0 says someone is there, and the parents are not read.
import { spawnSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { basename, join } from 'node:path';
import { put, runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { readPayload } from './lib/writes.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';

const ANCESTORS = 8;

// The words after the claude command in a process's command line, or null when it runs no claude.
function claudeArgs(args) {
  const words = args.trim().split(/\s+/).map((w) => w.replace(/^['"]|['"]$/g, ''));
  const at = words.findIndex((w) => basename(w) === 'claude');
  return at === -1 ? null : words.slice(at + 1);
}

// A process's command line is a print session: the claude command with -p or --print among its words.
export function printSession(args) {
  return (claudeArgs(args) ?? []).some((w) => w === '-p' || w === '--print');
}

// The parent, and the command line, of one process, by ps (the same on Linux and macOS).
function parentOf(pid) {
  const r = spawnSync('ps', ['-o', 'ppid=', '-o', 'args=', '-p', String(pid)], { encoding: 'utf8' });
  const m = r.status === 0 ? r.stdout.trim().match(/^(\d+)\s+(.*)$/) : null;
  return m ? { ppid: Number(m[1]), args: m[2] } : null;
}

function unattended() {
  const said = process.env.CLAUDE_PACKS_UNATTENDED;
  if (said === '1' || said === '0') return said === '1';
  for (let pid = process.ppid, n = 0; pid > 1 && n < ANCESTORS; n += 1) {
    const p = parentOf(pid);
    if (!p) return false;
    // the nearest claude is the session that runs this hook; one further up is another session (KWB-130)
    if (claudeArgs(p.args)) return printSession(p.args);
    pid = p.ppid;
  }
  return false;
}

function main(text) {
  const payload = readPayload(text);
  if (!payload) return 0; // not a refusal: an event that cannot be parsed has nothing to judge
  if (payload.tool_name !== 'Agent' && payload.tool_name !== 'Task') return 0;
  if (payload.tool_input?.run_in_background !== true || !unattended()) return 0;
  process.stderr.write(
    'BLOCKED by agents-held: this session runs with nobody there, and it ends when its turn ends: an agent started in the '
    + 'background is stopped with it, mid-work (KWB-124). Start the agent in the foreground (leave out run_in_background), '
    + 'and every independent agent in the same message, up to the project\'s agent limit: they run side by side.\n',
  );
  return 2;
}

function selftest() {
  const hook = new URL(import.meta.url).pathname;
  const dir = scratchProject({ 'src/a.ts': 'a\n' });
  const agent = (input) => ({ tool_name: 'Agent', tool_input: { description: 'W3 part', prompt: 'Read the brief.', ...input } });
  const as = (said, payload) => {
    process.env.CLAUDE_PACKS_UNATTENDED = said;
    return runHook(hook, dir, payload);
  };
  // the parents read for real: the hook run by a stand-in `claude -p`, with nothing said in the environment
  put(join(dir, 'bin/claude'), `#!/bin/sh\n"${process.execPath}" "${hook}"\n`);
  chmodSync(join(dir, 'bin/claude'), 0o755);
  // an interactive session started from a print session (a run's lead started from a `claude -p`): its own parent decides (KWB-130)
  put(join(dir, 'outer/claude'), `#!/bin/sh\n"${join(dir, 'bin/claude')}" --resume x\n`);
  chmodSync(join(dir, 'outer/claude'), 0o755);
  const env = { ...process.env, CLAUDE_PROJECT_DIR: dir };
  delete env.CLAUDE_PACKS_UNATTENDED;
  const underPrint = (flag, bin = 'bin') => spawnSync('sh', ['-c', `"${join(dir, bin, 'claude')}" ${flag} x`], {
    cwd: dir, env, encoding: 'utf8', input: JSON.stringify(agent({ run_in_background: true })),
  }).status;
  const before = process.env.CLAUDE_PACKS_UNATTENDED;
  const cases = [
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
  ];
  if (before === undefined) delete process.env.CLAUDE_PACKS_UNATTENDED;
  else process.env.CLAUDE_PACKS_UNATTENDED = before;
  return verdicts('agents-held', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('agents-held', main));
