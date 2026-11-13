// resident/agent-board (W8.6): the live agents the status line lists, kept as events arrive and judged on a planted clock (never real
// waiting): the tool with a ticking clock, `quiet 2m` after two minutes of silence, abandoned after five with no process of its own
// (W8.7's usageOf), back on its next event, gone on its stop, emptied by a SessionStart.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentBoard, ABANDON_MS, QUIET_MS } from '../../../packs/base/hooks/resident/agent-board.mts';
import { COLOURS as C, painter } from '../../../packs/base/tools/statusline-paint.mts';
import { agentSegments } from '../../../packs/base/tools/statusline-agents.mts';
import type { Usage } from '../../../packs/base/hooks/resident/usage.mts';
import type { HookEvent } from '../../../packs/base/hooks/lib/types.d.mts';

const P = '/work/p';
const T0 = 1_000_000_000_000;
const MIN = 60_000;
const BUSY: Usage = { cpu: 50, rssMb: 10, procs: 2 };
const none = (): Usage | null => null;
const pre = (agent: string, tool = 'Bash', extra: HookEvent = {}): HookEvent => ({ hook_event_name: 'PreToolUse', session_id: 's1', agent_id: agent, agent_type: agent, tool_name: tool, tool_input: { command: 'sleep 600' }, cwd: `${P}/.claude/worktrees/${agent}`, ...extra });
const post = (agent: string, tool = 'Bash'): HookEvent => ({ ...pre(agent, tool), hook_event_name: 'PostToolUse' });
const ids = (board: AgentBoard, now: number, usageOf: (owner: string) => Usage | null = none): string[] => board.rows(now, usageOf).map((r) => r.who);

const leadPre = (): HookEvent => ({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Bash', tool_input: { command: 'x' }, cwd: P });

test('a tool call shows its tool with a clock that differs between two renders a second apart', () => {
  const board = new AgentBoard(P);
  board.note(leadPre(), 100, T0);
  const paint = painter('none');
  const first = agentSegments(board.rows(T0 + 42_000, none), paint, C);
  const second = agentSegments(board.rows(T0 + 43_000, none), paint, C);
  assert.match(first.join('\n'), /lead/);
  assert.match(first.join('\n'), /Bash 0:42/);
  assert.match(second.join('\n'), /Bash 0:43/);
  assert.notEqual(first.join('\n'), second.join('\n'));
});

test('two minutes without an event turns the line yellow and says `quiet 2m`; before that it does not', () => {
  const board = new AgentBoard(P);
  board.note(leadPre(), 100, T0);
  const paint = painter('truecolor');
  const before = agentSegments(board.rows(T0 + QUIET_MS - 1000, none), paint, C).join('\n');
  assert.doesNotMatch(before, /quiet/);
  const after = agentSegments(board.rows(T0 + QUIET_MS, none), paint, C).join('\n');
  assert.match(after, /quiet 2m/);
  assert.ok(after.includes(`\x1b[38;2;${C.amber.r};${C.amber.g};${C.amber.b}m`), 'the quiet line is yellow');
  assert.ok(!before.includes(`\x1b[38;2;${C.amber.r};${C.amber.g};${C.amber.b}m`), 'before two minutes it is not');
});

test('the status line draws the session\'s own row and no row for an agent (W8.9: the agents are the project row\'s count and the monitor\'s)', () => {
  const board = new AgentBoard(P);
  board.note(leadPre(), 100, T0);
  board.note(pre('a1'), 100, T0);
  board.note(pre('a2'), 100, T0);
  assert.deepEqual(ids(board, T0 + 1000).sort(), ['a1', 'a2', 'lead'], 'the board keeps every one');
  const drawn = agentSegments(board.rows(T0 + 1000, none), painter('none'), C);
  assert.equal(drawn.length, 1, drawn.join('\n'));
  assert.match(drawn[0] ?? '', /^lead/);
});

test('five minutes of silence with no process of its own removes the agent; its next event brings it back', () => {
  const board = new AgentBoard(P);
  board.note(pre('a1'), 100, T0);
  assert.deepEqual(ids(board, T0 + ABANDON_MS - 1000), ['a1'], 'under five minutes it is listed');
  assert.deepEqual(ids(board, T0 + ABANDON_MS), [], 'at five minutes, with no process, it is gone');
  board.note(pre('a1', 'Read'), 100, T0 + ABANDON_MS + 1000);
  assert.deepEqual(ids(board, T0 + ABANDON_MS + 2000), ['a1'], 'its next event brings it back');
});

test('a stopped agent leaves the list at once, and a lead\'s Stop leaves its own line', () => {
  const board = new AgentBoard(P);
  board.note(pre('a1'), 100, T0);
  board.note(pre('a2'), 100, T0);
  board.note({ hook_event_name: 'SubagentStop', session_id: 's1', agent_id: 'a1', agent_type: 'a1', cwd: `${P}/.claude/worktrees/a1` }, 100, T0 + 1000);
  assert.deepEqual(ids(board, T0 + 2000), ['a2']);
  board.note({ hook_event_name: 'Stop', session_id: 's1', cwd: P }, 100, T0 + 3000);
  assert.deepEqual(ids(board, T0 + 4000), ['a2'], 'the lead had no line; the agent keeps its own');
});

test('an agent running a 10-minute command with no event stays listed past 5 minutes, and goes 5 minutes after its processes end', () => {
  const board = new AgentBoard(P);
  board.note(pre('a1'), 100, T0);
  let procs: Usage | null = BUSY;
  const usageOf = (owner: string): Usage | null => (owner === 'agent:a1' ? procs : null);
  // the daemon's sampler tick sees the command's processes every 2 s for ten minutes
  for (let t = 2000; t <= 10 * MIN; t += 2000) board.observe(T0 + t, usageOf);
  assert.deepEqual(ids(board, T0 + 10 * MIN, usageOf), ['a1'], 'past five minutes with no event and processes alive: listed');
  procs = null;   // the command ended at ten minutes
  board.observe(T0 + 10 * MIN + 2000, usageOf);
  assert.deepEqual(ids(board, T0 + 10 * MIN + 4 * MIN, usageOf), ['a1'], 'four minutes after the processes ended: still listed');
  assert.deepEqual(ids(board, T0 + 10 * MIN + 2000 + ABANDON_MS, usageOf), [], 'five minutes after the processes ended: removed');
});

test('a SessionStart empties the list, and a live agent\'s next event brings it back', () => {
  const board = new AgentBoard(P);
  board.note(pre('a1'), 100, T0);
  board.note(pre('a2'), 100, T0);
  board.note({ hook_event_name: 'SessionStart', session_id: 's2', source: 'startup', cwd: P }, 200, T0 + 1000);
  assert.deepEqual(ids(board, T0 + 2000), []);
  board.note(post('a2'), 100, T0 + 3000);
  assert.deepEqual(ids(board, T0 + 4000), ['a2']);
});

test('the lead is a line of its own, an agent in a worktree is owned by its folder, and the lead\'s last tool and command are kept', () => {
  const board = new AgentBoard(P);
  board.note({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Bash', tool_input: { command: 'npm run check' }, cwd: P }, 100, T0);
  board.note({ hook_event_name: 'PostToolUse', session_id: 's1', tool_name: 'Edit', tool_input: { file_path: '/work/p/src/a.ts' }, cwd: P }, 100, T0 + 1000);
  board.note(pre('a1'), 100, T0 + 1500);
  const rows = board.rows(T0 + 2000, none);
  assert.deepEqual(rows.map((r) => [r.who, r.owner]), [['lead', 'session:100'], ['a1', 'agent:a1']]);
  assert.deepEqual(board.activity('s1'), { tool: 'Edit', target: '/work/p/src/a.ts', command: 'npm run check' });
});
