// governor-agents: an agent's start holds one slot of the load governor (typescript order W8.8 item 4), so a wave cannot start more
// agents than the budget fits. The slot is held by the session's Claude Code process (the agent runs inside it), taken at the Agent
// tool's PreToolUse and freed at SubagentStop (the session's oldest agent slot) or, by the stale rule, when the session ends. A start
// past the budget waits for a slot up to AGENT_WAIT_MS inside the hook, then is refused with the governor's answer (start it again).
//   agentSlot(host, start) -> { ok, grant } | { ok: false, line }        freeAgentSlot(host, sessionPid) -> the id freed, or null
import { free, grantWithin, inFlight } from './governor.mts';
import type { GovernorHost, Grant } from './governor.mts';

/** How long an agent's start waits for a slot before it is refused: under the hook's own timeout (60 s in pack.json). */
export const AGENT_WAIT_MS = 40_000;
/** Each agent holds this many slots: its own process; its tests and builds take their own grants through `governed`. */
export const AGENT_SLOTS = 1;

/** One agent's start: the session that runs it, the project, the tool call's id, the lead's priority, and how long it may wait. */
export interface AgentStart { sessionPid: number; project: string; toolUseId: string; priority: number | undefined; waitMs: number }

export type AgentSlot = { ok: true; grant: Grant } | { ok: false; line: string };

/** Takes the agent's slot, waiting up to `waitMs` for one. */
export function agentSlot(host: GovernorHost, start: AgentStart): AgentSlot {
  let last = '';
  const grant = grantWithin(host, { kind: 'agent', want: AGENT_SLOTS, priority: start.priority, project: start.project, pid: start.sessionPid,
    command: `agent ${start.toolUseId}` }, start.waitMs, (answer) => { last = answer.line; });
  return grant === null ? { ok: false, line: last } : { ok: true, grant };
}

/** Frees the session's oldest agent slot (an agent of it has stopped); the id freed, or null when it holds none. */
export function freeAgentSlot(host: GovernorHost, sessionPid: number): string | null {
  const held = inFlight(host).jobs.filter((j) => j.kind === 'agent' && j.pid === sessionPid).sort((a, b) => a.start - b.start)[0];
  return held !== undefined && free(host, held.id) ? held.id : null;
}
