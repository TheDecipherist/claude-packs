// PreToolUse (Agent|Task): an agent names its model, and Opus names its reason (U73, gs-sm#18).
// An omitted model inherits the session's most expensive one, so an agent spawn that names none is refused, and so is one that names
// Opus without a line `OPUS BECAUSE: <reason>` in its prompt, the reason one the project lists (`layout.json` guards.agentModel.opusReasons).
// Exempt: a fork (its model is ignored), and an agent type whose own definition (.claude/agents/<type>.md, in the checkout or the
// user's folder) sets `model:` in its frontmatter. Opt-in (a new refusal never switches on in an existing project: "enable").
// A judge on the hook contract; it reads a few small files and writes none. `--selftest` proves it.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, runAsHook } from './lib/hook-log.mts';
import { checkoutRoot } from './lib/project.mts';
import { runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookContext, HookEvent } from './lib/types.d.mts';
import { pass, refuse } from './lib/verdict.mts';

const AGENT_TOOLS: ReadonlySet<string> = new Set(['Agent', 'Task']);
export const DEFAULT_REASONS: readonly string[] = ['architecture decision', 'hard debugging', 'security review', 'ambiguous spec', 'cross-file refactor'];
const BECAUSE = /^\s*OPUS BECAUSE:\s*(.+?)\s*$/im;

/** The reasons Opus may be named for: the project's list, else the default. */
export function opusReasons(ctx: HookContext): readonly string[] {
  const own = (ctx.layout.guards?.['agentModel'] as { opusReasons?: unknown } | undefined)?.opusReasons;
  const list = Array.isArray(own) ? own.filter((r): r is string => typeof r === 'string' && r.trim() !== '') : [];
  return list.length ? list : DEFAULT_REASONS;
}

// True when `.claude/agents/<type>.md` under one of these folders has `model:` in its frontmatter.
function definesModel(type: string, folders: readonly string[]): boolean {
  if (!/^[\w.:-]+$/.test(type)) return false;
  return folders.some((dir) => {
    const file = join(dir, '.claude', 'agents', `${type.replace(/^.*:/, '')}.md`);
    if (!existsSync(file)) return false;
    const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, 'utf8'))?.[1] ?? '';
    return /^model:\s*\S/m.test(front);
  });
}

function judge(event: HookEvent, ctx: HookContext): string | null {
  const input = event.tool_input ?? {};
  const type = typeof input.subagent_type === 'string' ? input.subagent_type : '';
  if (type === 'fork') return null;
  const model = typeof input.model === 'string' ? input.model.trim() : '';
  if (model === '' && type !== '' && definesModel(type, [checkoutRoot(ctx.projectDir, join(typeof event.cwd === 'string' ? event.cwd : ctx.cwd, 'x'), '/'), ctx.projectDir, ctx.env['HOME'] ?? ''].filter(Boolean))) return null;
  if (model === '') {
    return 'BLOCKED by agent-model: this agent names no `model`, so it would inherit the session\'s most expensive one. Set `model` on the call: '
      + '"sonnet" by default, "haiku" for lookups, "opus" only with a line `OPUS BECAUSE: <reason>` in the prompt.';
  }
  if (!/opus/i.test(model)) return null;
  const reasons = opusReasons(ctx);
  const said = BECAUSE.exec(typeof input.prompt === 'string' ? input.prompt : '')?.[1]?.toLowerCase();
  if (said && reasons.some((r) => said.startsWith(r.toLowerCase()))) return null;
  return said
    ? `BLOCKED by agent-model: "OPUS BECAUSE: ${said}" is not a reason on the list. The reasons: ${reasons.join('; ')}. Use one, or name "sonnet".`
    : `BLOCKED by agent-model: this agent names Opus with no \`OPUS BECAUSE: <reason>\` line in its prompt. The reasons: ${reasons.join('; ')}. Add the line, or name "sonnet".`;
}

export const hook: Hook = (event, ctx) => {
  if (!AGENT_TOOLS.has(event.tool_name ?? '')) return pass;
  const reason = judge(event, ctx);
  return reason === null ? pass : refuse(reason);
};

const spawn = (input: Record<string, unknown>, cwd?: string): Record<string, unknown> => ({ hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { description: 'd', prompt: 'work', ...input }, ...(cwd ? { cwd } : {}) });

/** The worktree defines the agent type; main does not. Each checkout is judged by its own `.claude/agents/`. */
export const worktreeCase: WorktreeCase = {
  files: { '{wt}/.claude/agents/scout.md': '---\nname: scout\nmodel: haiku\n---\nA scout.\n' },
  steps: [
    { label: 'a type the worktree defines, no model', event: spawn({ subagent_type: 'scout' }, '{wt}'), want: 0 },
    { label: 'the same type in the main checkout, which has no definition', event: spawn({ subagent_type: 'scout' }, '{here}'), want: 2 },
  ],
};

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({
    '.claude/agents/scout.md': '---\nname: scout\nmodel: haiku\n---\nA scout.\n',
    '.claude/agents/plain.md': '---\nname: plain\ndescription: no model here\n---\nPlain.\n',
  }, { guards: { agentModel: { opusReasons: ['tight deadline'] } } });
  const run = (input: Record<string, unknown>): number | null => runHook(hookFile, dir, spawn(input)).status;
  const stderr = runHook(hookFile, dir, spawn({ model: 'opus', prompt: 'x\nOPUS BECAUSE: hard debugging' })).stderr;
  return verdicts('agent-model', [
    ['a fork has no model of its own', run({ subagent_type: 'fork' }), 0],
    ['a type whose definition sets a model', run({ subagent_type: 'scout' }), 0],
    ['a type whose definition sets none', run({ subagent_type: 'plain' }), 2],
    ['sonnet', run({ model: 'sonnet' }), 0],
    ['no model', run({}), 2],
    ['opus with no reason', run({ model: 'opus' }), 2],
    ['opus with a reason that is not listed (the project\'s list replaces the default)', stderr.includes('not a reason on the list') ? 2 : 0, 2],
    ['opus with a listed reason', run({ model: 'claude-opus-4-5', prompt: 'x\nOPUS BECAUSE: tight deadline, one shot' }), 0],
    ['another tool is not an agent', runHook(hookFile, dir, { tool_name: 'Bash', tool_input: { command: 'ls' } }).status, 0],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'agent-model', hook, selftest);
