// heartbeat (1.8.0): every agent's sign of life, written by the hooks, never by the agent (the user: "a user will think that
// its crashed if it doesnt update regularly", "it should be the hooks themselves that do it"). Before and after every tool
// call, async so it never holds one, it writes what that agent is doing into the main checkout's
// .claude/logs/heartbeats/<worktree>.json (lead.json for the checkout itself): { t, event: pre|post, tool, what, agent }.
// The status line and `status` read it: what each agent is doing and how long ago, a long call as running, and nothing
// for minutes as quiet. The agent is the worktree its call works in: its cwd, else the first worktree path the call names,
// else the worktree its agent id last worked in. It refuses nothing, and writes only inside the project.
// A recorder on the hook contract (typescript order W4): it writes files and refuses nothing; the time is the event's (`ctx.now`).
import { mkdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { contextOf, isMain, runAsHook } from './lib/hook-log.mts';
import { readJson, writeJson } from './lib/json.mts';
import { runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookEvent, ToolInput } from './lib/types.d.mts';
import { pass } from './lib/verdict.mts';
import { fileURLToPath } from 'node:url';

const TREE = /\.claude\/worktrees\/([\w.-]+)/;
const EVENTS: Readonly<Record<string, 'pre' | 'post'>> = { PreToolUse: 'pre', PostToolUse: 'post' };
const WHAT_FIELDS = ['description', 'file_path', 'notebook_path', 'command', 'pattern', 'url', 'path', 'prompt'] as const;

/** The main checkout: the project, even when the session was started inside one of its worktrees. */
export const mainOf = (dir: string): string => resolve(dir).replace(/\/\.claude\/worktrees\/[^/]+(?:\/.*)?$/, '');

/** Which of the project's agents made this call: a worktree's name, 'lead', or null for a call outside the project. */
export function agentOf(ev: HookEvent, main: string): string | null {
  const input: ToolInput = ev.tool_input ?? {};
  const paths = [ev.cwd, input.file_path, input.notebook_path, input['path']].filter((p): p is string => typeof p === 'string');
  const named = typeof input.command === 'string' ? input.command.match(/(?:^|[\s'"=])((?:\/|\.\/)?[^\s'"]*\.claude\/worktrees\/[\w.-]+)/)?.[1] : null;
  for (const p of [...paths, named]) {
    if (!p) continue;
    const abs = isAbsolute(p) ? p : resolve(ev.cwd ?? main, p);
    if (abs.startsWith(`${main}/.claude/worktrees/`)) return abs.match(TREE)?.[1] ?? null;
  }
  const known = ev.agent_id ? readJson<{ name?: unknown }>(join(main, '.claude', 'logs', 'heartbeats', `agent-${ev.agent_id}.json`))?.name : null;
  if (typeof known === 'string') return known;
  const cwd = ev.cwd ? resolve(ev.cwd) : main;
  return cwd === main || cwd.startsWith(`${main}/`) ? 'lead' : null;
}

const what = (input: ToolInput = {}): string => {
  const v = WHAT_FIELDS.map((f) => input[f]).find((x): x is string => typeof x === 'string' && x.trim() !== '');
  return v ? v.replace(/\s+/g, ' ').trim().slice(0, 120) : '';
};

export const hook: Hook = (ev, ctx) => {
  const kind = EVENTS[ev.hook_event_name ?? ''];
  if (!kind) return pass;   // not a refusal: a heartbeat only records
  const root = mainOf(ctx.env['CLAUDE_PROJECT_DIR'] || ev.cwd || ctx.cwd);
  const name = agentOf(ev, root);
  if (!name) return pass;   // not a refusal: a call outside the project is not this project's agent
  const dir = join(root, '.claude', 'logs', 'heartbeats');
  try { mkdirSync(dir, { recursive: true }); } catch { return pass; }   // not a refusal: no heartbeat is no harm
  writeJson(join(dir, `${name}.json`), { t: new Date(ctx.now).toISOString(), event: kind, tool: ev.tool_name ?? '', what: what(ev.tool_input), agent: ev.agent_id ?? null });
  if (ev.agent_id && name !== 'lead') writeJson(join(dir, `agent-${ev.agent_id}.json`), { name });
  return pass;
};

/** A call in the worktree is that agent's heartbeat and lets the call through, in the main checkout as in the worktree. Where the
 *  beat is written (the main checkout, never the worktree) is read from files, which a case as data cannot: worktrees.test.mjs. */
export const worktreeCase: WorktreeCase = {
  steps: [
    { label: 'a call in the worktree', event: { hook_event_name: 'PreToolUse', cwd: '{wt}', tool_name: 'Edit', tool_input: { file_path: '{wt}/src/x.cpp' } }, want: 0 },
    { label: 'a call in the main checkout', event: { hook_event_name: 'PostToolUse', cwd: '{here}', tool_name: 'Read', tool_input: { file_path: '{here}/CLAUDE.md' } }, want: 0 },
  ],
};

type Beat = { what?: unknown; event?: unknown; tool?: unknown };

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({ 'README.md': '# x\n' });
  const beat = (name: string): Beat | null => readJson<Beat>(join(dir, '.claude', 'logs', 'heartbeats', `${name}.json`));
  const call = (ev: Record<string, unknown>): true => { runHook(hookFile, dir, { hook_event_name: 'PreToolUse', ...ev }); return true; };
  const tree = join(dir, '.claude', 'worktrees', 'api');
  mkdirSync(tree, { recursive: true });
  // an event whose fields are not what they should be: the hook, called as the runner calls it, says nothing and does not throw
  const strange = (): number | string => {
    try {
      const verdict = hook({ hook_event_name: 'PreToolUse', tool_input: { limit: 5 } }, contextOf({ projectDir: dir, cwd: dir, env: { CLAUDE_PROJECT_DIR: dir } }));
      return verdict instanceof Promise ? 'promise' : verdict.code;
    } catch { return 'threw'; }
  };
  return verdicts('heartbeat', [
    ['a call in an agent\'s worktree is that agent\'s', call({ cwd: tree, tool_name: 'Bash', tool_input: { command: 'make', description: 'build the server' }, agent_id: 'a1' }) && String(beat('api')?.what), 'build the server'],
    ['a long call is marked as begun', String(beat('api')?.event), 'pre'],
    ['its end is marked too', runHook(hookFile, dir, { hook_event_name: 'PostToolUse', cwd: tree, tool_name: 'Bash', tool_input: { command: 'make' } }).status === 0 && String(beat('api')?.event), 'post'],
    ['a call from the main checkout naming a worktree path is that agent\'s', call({ cwd: dir, tool_name: 'Edit', tool_input: { file_path: join(dir, '.claude/worktrees/web/src/page.ts') } }) && String(beat('web')?.tool), 'Edit'],
    ['a command from the main checkout that names a worktree is that agent\'s', call({ cwd: dir, tool_name: 'Bash', tool_input: { command: 'cd .claude/worktrees/docs && make' } }) && String(beat('docs')?.tool), 'Bash'],
    ['a call naming no worktree is its agent id\'s last worktree', call({ cwd: dir, tool_name: 'Read', tool_input: { file_path: join(dir, 'README.md') }, agent_id: 'a1' }) && String(beat('api')?.tool), 'Read'],
    ['the lead\'s own call is the lead\'s', call({ cwd: dir, tool_name: 'Grep', tool_input: { pattern: 'parseRow' } }) && String(beat('lead')?.what), 'parseRow'],
    ['a call in a sibling project writes nothing', call({ cwd: join(dir, '..', 'sibling'), tool_name: 'Read', tool_input: { file_path: '/elsewhere/x' } }) && (beat('sibling') === null ? 'none' : 'a beat'), 'none'],
    ['a broken event lets the call through', runHook(hookFile, dir, null).status, 0],
    ['a strange event never throws', strange(), 0],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'heartbeat', hook, selftest);
