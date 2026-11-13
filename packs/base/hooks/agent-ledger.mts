// PreToolUse + PostToolUse (Agent|Task) and SubagentStop: every agent's model, brief, run time and tokens, in `.claude/logs/agents.jsonl` (U74, gs-sm#19).
// It refuses nothing. One line per spawn (PreToolUse: model, subagent type, description, the first line of the prompt, masked by
// secret-patterns), one per finish (SubagentStop: agent id, type), and one `usage` line when a foreground agent returns (PostToolUse:
// resolved model, run time and tokens as Claude Code's tool_response carries them; a background launch has none). Logs are never cleared:
// `appendRotated` moves a full one to `.claude/logs/`. `--selftest` proves it.
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendRotated, isMain, runAsHook } from './lib/hook-log.mts';
import { readText } from './lib/files.mts';
import { parseJson, toJson } from './lib/json.mts';
import { maskSecrets } from './lib/secret-patterns.mts';
import { runHook, scratchProject, verdicts } from './lib/selftest.mts';
import type { WorktreeCase } from './lib/selftest.mts';
import type { Hook, HookContext, HookEvent } from './lib/types.d.mts';
import { pass } from './lib/verdict.mts';

export const LEDGER = join('.claude', 'logs', 'agents.jsonl');
const AGENT_TOOLS: ReadonlySet<string> = new Set(['Agent', 'Task']);
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);

/** The ledger line an event makes, or null when it makes none. */
export function lineOf(event: HookEvent, now: number): Record<string, unknown> | null {
  const t = new Date(now).toISOString();
  const common = { t, session: text(event.session_id) };
  if (event.hook_event_name === 'SubagentStop') {
    return { ...common, event: 'finish', agent: text(event.agent_id), type: text(event.agent_type), reply: maskSecrets(text(event.last_assistant_message)).length };
  }
  if (!AGENT_TOOLS.has(event.tool_name ?? '')) return null;
  const input = event.tool_input ?? {};
  if (event.hook_event_name === 'PostToolUse') {
    const r = (event.tool_response ?? {}) as Record<string, unknown>;
    if (r['status'] !== 'completed') return null;   // a background launch has no usage yet
    return { ...common, event: 'usage', call: text(event.tool_use_id), agent: text(r['agentId']), model: text(r['resolvedModel']),
      ms: num(r['totalDurationMs']), tokens: num(r['totalTokens']), tools: num(r['totalToolUseCount']) };
  }
  const prompt = text(input.prompt).split('\n').find((l) => l.trim() !== '') ?? '';
  return { ...common, event: 'spawn', call: text(event.tool_use_id), model: text(input.model) || null, type: text(input.subagent_type),
    background: input.run_in_background === true, description: maskSecrets(text(input.description)), brief: maskSecrets(prompt).slice(0, 200) };
}

export const hook: Hook = (event: HookEvent, ctx: HookContext) => {
  const line = lineOf(event, ctx.now);
  if (line !== null) appendRotated(ctx.projectDir, LEDGER, `${toJson(line)}\n`);
  return pass;
};

/** An agent spawned from a worktree is logged in the project's one ledger, and the hook refuses nothing there. */
export const worktreeCase: WorktreeCase = {
  steps: [{ label: 'a spawn from the worktree', event: { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { model: 'sonnet', prompt: 'x' }, cwd: '{wt}' }, want: 0 }],
};

/** The ledger's lines as records. */
export const rowsOf = (log: string): Record<string, unknown>[] => log.split('\n').filter(Boolean).map((l) => parseJson<Record<string, unknown>>(l) ?? {});

export function selftest(): number {
  const hookFile = fileURLToPath(import.meta.url);
  const dir = scratchProject({}, { folders: {}, concepts: {} });
  const fire = (e: Record<string, unknown>): number | null => runHook(hookFile, dir, { session_id: 's1', ...e }).status;
  const key = 'sk-ant-api03-' + 'a'.repeat(40);
  const codes = [
    fire({ hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_use_id: 'tu1', tool_input: { model: 'sonnet', subagent_type: 'general-purpose', description: 'Scan', prompt: `\nread ${key}\nmore` } }),
    fire({ hook_event_name: 'SubagentStop', agent_id: 'a1', agent_type: 'general-purpose', last_assistant_message: 'DONE' }),
    fire({ hook_event_name: 'PostToolUse', tool_name: 'Agent', tool_use_id: 'tu1', tool_input: {}, tool_response: { status: 'completed', agentId: 'a1', resolvedModel: 'claude-sonnet-x', totalDurationMs: 4821, totalTokens: 900 } }),
    fire({ hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } }),
  ];
  const rows = rowsOf(readText(join(dir, LEDGER)) ?? '');
  const [spawn, finish, usage] = rows;
  return verdicts('agent-ledger', [
    ['it refuses nothing', codes.join(','), '0,0,0,0'],
    ['a spawn, a finish and a usage line; the other tool leaves none', rows.map((r) => r['event']).join(','), 'spawn,finish,usage'],
    ['the spawn carries model, brief and description', `${spawn?.['model']}|${spawn?.['type']}|${spawn?.['description']}`, 'sonnet|general-purpose|Scan'],
    ['the brief is the first line, masked', String(spawn?.['brief']).includes(key) ? 'leaked' : 'masked', 'masked'],
    ['the finish names the agent', `${finish?.['agent']}|${finish?.['type']}`, 'a1|general-purpose'],
    ['the usage line carries run time and tokens', `${usage?.['ms']}|${usage?.['tokens']}|${usage?.['model']}`, '4821|900|claude-sonnet-x'],
  ]);
}

if (isMain(import.meta.url)) await runAsHook(import.meta.url, 'agent-ledger', hook, selftest);
