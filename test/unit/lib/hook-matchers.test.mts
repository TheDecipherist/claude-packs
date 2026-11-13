// A hook that judges one tool sits in a group whose matcher takes that tool (KWB-next, the audit run, W2): two Agent-call hooks
// were registered under the Write|Edit|...|Bash group, so a real session would never have shown them an Agent call, and both
// selftests passed, because a selftest drives the hook through the runner without the matcher.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { availablePacks, readPack } from '../../../lib/packs.mjs';

const KIT = fileURLToPath(new URL('../../../', import.meta.url));

interface Group { matcher?: string; hooks: { command: string }[] }

/** The tool names a hook's source tests for by name: `tool_name === 'X'` and a `..._TOOLS = new Set([...])` list. */
export function toolsJudged(source: string): string[] {
  const named = [...source.matchAll(/tool_name\s*(?:===|!==)\s*'(\w+)'/g)].map((m) => m[1] ?? '');
  const sets = [...source.matchAll(/_TOOLS\b[^=\n]*=\s*new Set(?:<[^>]*>)?\(\[([^\]]*)\]/g)].flatMap((m) => [...(m[1] ?? '').matchAll(/'(\w+)'/g)].map((n) => n[1] ?? ''));
  return [...new Set([...named, ...sets])].filter(Boolean);
}

/** Every hook of a pack registered on a tool event whose groups' matchers take none of the tools it tests for, as `hook: tools`. */
export function unreachable(groupsByEvent: Record<string, Group[]>, sourceOf: (hook: string) => string | null): string[] {
  const faults: string[] = [];
  for (const event of ['PreToolUse', 'PostToolUse']) {
    const where = new Map<string, string[]>();
    for (const g of groupsByEvent[event] ?? []) for (const h of g.hooks) {
      const name = /hooks\/([\w-]+)\.mjs/.exec(h.command)?.[1];
      if (name) where.set(name, [...(where.get(name) ?? []), g.matcher ?? '*']);
    }
    for (const [name, matchers] of where) {
      const tools = toolsJudged(sourceOf(name) ?? '');
      const taken = (tool: string): boolean => matchers.some((m) => m === '*' || m === '' || new RegExp(`^(?:${m})$`).test(tool));
      if (tools.length && !tools.some(taken)) faults.push(`${event} ${name}: ${tools.join(', ')} under ${matchers.join(' ; ')}`);
    }
  }
  return faults;
}

test('every hook that judges a tool by name sits in a group whose matcher takes it, in every pack', () => {
  const faults = availablePacks().flatMap((pack) => {
    const read = (hook: string): string | null => { const f = join(KIT, 'packs', pack, 'hooks', `${hook}.mts`); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
    return unreachable((readPack(pack).hooks ?? {}) as Record<string, Group[]>, read).map((f) => `${pack}: ${f}`);
  });
  assert.deepEqual(faults, []);
});

test('a planted Agent hook under the Write group is found, and the same hook under Agent|Task is not', () => {
  const src = "const AGENT_TOOLS: ReadonlySet<string> = new Set(['Agent', 'Task']);\nif (!AGENT_TOOLS.has(event.tool_name)) return pass;";
  const hook = { command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/plant.mjs"' };
  const wrong = { PreToolUse: [{ matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash', hooks: [hook] }] };
  const right = { PreToolUse: [{ matcher: 'Agent|Task', hooks: [hook] }] };
  assert.equal(unreachable(wrong, () => src).length, 1);
  assert.deepEqual(unreachable(right, () => src), []);
  assert.deepEqual(toolsJudged("if (event.tool_name === 'Skill') log();"), ['Skill']);
});
