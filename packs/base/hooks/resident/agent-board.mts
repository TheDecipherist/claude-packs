// resident/agent-board: the live sessions and agents the status line lists (typescript order W8.6), kept by the daemon as the events
// arrive and never rebuilt from files, transcripts or `ps`. An entry is a lead (one per session) or an agent (by its agent id); a tool
// call starts its clock, a stop removes it, a SessionStart empties the board. An entry with no event for QUIET_MS is `quiet`; one with
// no event and no process of its own (usageOf, W8.7's sampler) for ABANDON_MS is dropped, and returns on its next event, so a long
// command keeps its agent listed for as long as its processes live and five minutes after.
import { oneLine, targetOf } from '../lib/tool-target.mts';
import type { HookEvent } from '../lib/types.d.mts';
import { agentOwner, sessionOwner, worktreeOf, type Usage } from './usage.mts';

/** No event for this long: the line turns yellow and says `quiet`. */
export const QUIET_MS = 2 * 60_000;
/** No event and no process for this long: the entry is removed as abandoned. */
export const ABANDON_MS = 5 * 60_000;

/** What the board shows of one entry at a moment. */
export interface BoardRow {
  key: string;
  /** `lead`, or the agent's worktree folder name, else its type. */
  who: string;
  /** The sampler's owner of the entry (`session:<pid>`, `agent:<name>`). */
  owner: string;
  tool: string;
  target: string;
  /** A tool call has started and not ended. */
  running: boolean;
  /** How long the tool has run, or how long since the entry's last event when none runs. */
  clockMs: number;
  silentMs: number;
  quiet: boolean;
}

/** What the lead's own events say of its last tool and its last shell command. */
export interface LeadActivity { tool?: string; target?: string; command?: string }

interface Entry { key: string; session: string; who: string; owner: string; tool: string; target: string; running: boolean; toolStart: number; lastEvent: number; lastLife: number }
type UsageOf = (owner: string) => Usage | null;

const STOPS = new Set(['Stop', 'SubagentStop', 'SessionEnd']);
const COMMIT = /\bgit\s+(?:-C\s+\S+\s+)?commit\b/;

export class AgentBoard {
  private readonly entries = new Map<string, Entry>();
  private readonly activities = new Map<string, LeadActivity>();
  /** The last `git commit` a Bash call ended with, and who ran it. */
  lastCommit: { at: number; who: string } | null = null;
  private readonly project: string;
  constructor(project: string) { this.project = project; }

  /** One hook event of the project: `ppid` is the claude process that sent it, `now` the event's arrival. */
  note(ev: HookEvent, ppid: number, now: number): void {
    const name = ev.hook_event_name ?? '';
    const session = ev.session_id ?? '';
    const agent = typeof ev.agent_id === 'string' && ev.agent_id !== '' ? ev.agent_id : null;
    if (name === 'SessionStart') { this.entries.clear(); this.activities.clear(); return; }
    if (name === 'SessionEnd') { for (const [k, e] of this.entries) if (e.session === session) this.entries.delete(k); this.activities.delete(session); return; }
    const key = agent ?? `lead:${session}`;
    if (STOPS.has(name)) { this.entries.delete(key); return; }
    const folder = worktreeOf(ev.cwd ?? '', this.project);
    const e = this.entries.get(key) ?? { key, session, who: '', owner: '', tool: '', target: '', running: false, toolStart: now, lastEvent: now, lastLife: now };
    e.who = agent === null ? 'lead' : (folder ?? ev.agent_type ?? agent.slice(0, 12));
    e.owner = folder !== null ? agentOwner(folder) : sessionOwner(ppid);
    e.lastEvent = e.lastLife = now;
    const tool = ev.tool_name ?? '';
    if (tool !== '' && name === 'PreToolUse') Object.assign(e, { tool, target: targetOf(ev.tool_input), running: true, toolStart: now });
    else if (name === 'PostToolUse' || name === 'PostToolUseFailure') e.running = false;
    this.entries.set(key, e);
    if (tool !== '' && agent === null) this.noteLead(session, ev, tool);
    if (name === 'PostToolUse' && tool === 'Bash' && COMMIT.test(String(ev.tool_input?.command ?? ''))) this.lastCommit = { at: now, who: e.who };
  }

  private noteLead(session: string, ev: HookEvent, tool: string): void {
    const a = this.activities.get(session) ?? {};
    a.tool = tool;
    a.target = targetOf(ev.tool_input);
    if (tool === 'Bash') a.command = oneLine(ev.tool_input?.command);
    this.activities.set(session, a);
  }

  /** The lead's last tool and shell command, from its events. */
  activity(session: string): LeadActivity { return this.activities.get(session) ?? {}; }

  /** The sampler's view at `now`: an entry whose owner has a process is alive; one silent and without a process for ABANDON_MS is dropped. */
  observe(now: number, usageOf: UsageOf): void {
    for (const [key, e] of this.entries) {
      if ((usageOf(e.owner)?.procs ?? 0) > 0) e.lastLife = Math.max(e.lastLife, now);
      else if (now - Math.max(e.lastEvent, e.lastLife) >= ABANDON_MS) this.entries.delete(key);
    }
  }

  /** The entries at `now`, oldest first. */
  rows(now: number, usageOf: UsageOf): BoardRow[] {
    this.observe(now, usageOf);
    return [...this.entries.values()].map((e) => {
      const silentMs = now - e.lastEvent;
      return { key: e.key, who: e.who, owner: e.owner, tool: e.tool, target: e.target, running: e.running, clockMs: now - (e.running ? e.toolStart : e.lastEvent), silentMs, quiet: silentMs >= QUIET_MS };
    });
  }
}
