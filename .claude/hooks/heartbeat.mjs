#!/usr/bin/env node
// heartbeat (1.8.0): every agent's sign of life, written by the hooks, never by the agent (the user: "a user will think that
// its crashed if it doesnt update regularly", "it should be the hooks themselves that do it"). Before and after every tool
// call, async so it never holds one, it writes what that agent is doing into the main checkout's
// .claude/logs/heartbeats/<worktree>.json (lead.json for the checkout itself): { t, event: pre|post, tool, what, agent }.
// The status line and `status` read it: what each agent is doing and how long ago, a long call as running, and nothing
// for minutes as quiet. The agent is the worktree its call works in: its cwd, else the first worktree path the call names,
// else the worktree its agent id last worked in. It refuses nothing, and writes only inside the project.
import { mkdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { parseJson, readJson, writeJson } from './lib/json.mjs';
import { runHook, scratchProject, verdicts } from './lib/selftest.mjs';
import { asHook, isMain } from './lib/hook-log.mjs';
import { fileURLToPath } from 'node:url';

const TREE = /\.claude\/worktrees\/([\w.-]+)/;
const EVENTS = { PreToolUse: 'pre', PostToolUse: 'post' };
const WHAT_FIELDS = ['description', 'file_path', 'notebook_path', 'command', 'pattern', 'url', 'path', 'prompt'];

/** The main checkout: the project, even when the session was started inside one of its worktrees. */
export const mainOf = (dir) => resolve(dir).replace(/\/\.claude\/worktrees\/[^/]+(?:\/.*)?$/, '');

/** Which of the project's agents made this call: a worktree's name, 'lead', or null for a call outside the project. */
export function agentOf(ev, main) {
  const input = ev.tool_input ?? {};
  const paths = [ev.cwd, input.file_path, input.notebook_path, input.path].filter((p) => typeof p === 'string');
  const named = typeof input.command === 'string' ? input.command.match(/(?:^|[\s'"=])((?:\/|\.\/)?[^\s'"]*\.claude\/worktrees\/[\w.-]+)/)?.[1] : null;
  for (const p of [...paths, named].filter(Boolean)) {
    const abs = isAbsolute(p) ? p : resolve(ev.cwd ?? main, p);
    if (abs.startsWith(`${main}/.claude/worktrees/`)) return abs.match(TREE)[1];
  }
  const known = ev.agent_id && readJson(join(main, '.claude', 'logs', 'heartbeats', `agent-${ev.agent_id}.json`))?.name;
  if (typeof known === 'string') return known;
  const cwd = ev.cwd ? resolve(ev.cwd) : main;
  return cwd === main || cwd.startsWith(`${main}/`) ? 'lead' : null;
}

const what = (input = {}) => {
  const v = WHAT_FIELDS.map((f) => input[f]).find((x) => typeof x === 'string' && x.trim());
  return v ? v.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
};

function main(text) {
  const ev = parseJson(text);
  if (!ev || !EVENTS[ev.hook_event_name]) return 0;   // not a refusal: a heartbeat only records
  const root = mainOf(process.env.CLAUDE_PROJECT_DIR || ev.cwd || process.cwd());
  const name = agentOf(ev, root);
  if (!name) return 0;   // not a refusal: a call outside the project is not this project's agent
  const dir = join(root, '.claude', 'logs', 'heartbeats');
  try { mkdirSync(dir, { recursive: true }); } catch { return 0; }   // not a refusal: no heartbeat is no harm
  writeJson(join(dir, `${name}.json`), { t: new Date().toISOString(), event: EVENTS[ev.hook_event_name], tool: ev.tool_name ?? '', what: what(ev.tool_input), agent: ev.agent_id ?? null });
  if (ev.agent_id && name !== 'lead') writeJson(join(dir, `agent-${ev.agent_id}.json`), { name });
  return 0;
}

function selftest() {
  const hook = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'README.md': '# x\n' });
  const beat = (name) => readJson(join(dir, '.claude', 'logs', 'heartbeats', `${name}.json`));
  const call = (ev) => { runHook(hook, dir, { hook_event_name: 'PreToolUse', ...ev }); return true; };
  const tree = join(dir, '.claude', 'worktrees', 'api');
  mkdirSync(tree, { recursive: true });
  const cases = [
    ['a call in an agent\'s worktree is that agent\'s', call({ cwd: tree, tool_name: 'Bash', tool_input: { command: 'make', description: 'build the server' }, agent_id: 'a1' }) && beat('api')?.what, 'build the server'],
    ['a long call is marked as begun', beat('api')?.event, 'pre'],
    ['its end is marked too', runHook(hook, dir, { hook_event_name: 'PostToolUse', cwd: tree, tool_name: 'Bash', tool_input: { command: 'make' } }) === 0 && beat('api')?.event, 'post'],
    ['a call from the main checkout naming a worktree path is that agent\'s', call({ cwd: dir, tool_name: 'Edit', tool_input: { file_path: join(dir, '.claude/worktrees/web/src/page.ts') } }) && beat('web')?.tool, 'Edit'],
    ['a command from the main checkout that names a worktree is that agent\'s', call({ cwd: dir, tool_name: 'Bash', tool_input: { command: 'cd .claude/worktrees/docs && make' } }) && beat('docs')?.tool, 'Bash'],
    ['a call naming no worktree is its agent id\'s last worktree', call({ cwd: dir, tool_name: 'Read', tool_input: { file_path: join(dir, 'README.md') }, agent_id: 'a1' }) && beat('api')?.tool, 'Read'],
    ['the lead\'s own call is the lead\'s', call({ cwd: dir, tool_name: 'Grep', tool_input: { pattern: 'parseRow' } }) && beat('lead')?.what, 'parseRow'],
    ['a call in a sibling project writes nothing', call({ cwd: join(dir, '..', 'sibling'), tool_name: 'Read', tool_input: { file_path: '/elsewhere/x' } }) && beat('sibling'), null],
    ['a broken event lets the call through', runHook(hook, dir, null), 0],
    ['broken event text never throws', (() => { try { return main('{ "hook_event_name": "PreToolUse", '); } catch { return 'threw'; } })(), 0],
  ];
  return verdicts('heartbeat', cases);
}

export const hook = main; // run-hooks.mjs calls it with the event's text (KWB-24)
if (isMain(import.meta.url)) process.exit(process.argv.includes('--selftest') ? selftest() : await asHook('heartbeat', main));
