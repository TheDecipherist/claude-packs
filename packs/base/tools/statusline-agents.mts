// The status line's live agents (typescript order W8.6): one row per session and agent the daemon has seen an event from, each with its
// tool and a clock that ticks at every render (`Bash 0:42`); a row with no event for two minutes turns yellow and says `quiet 2m`.
// The rows come from the daemon's board (hooks/resident/agent-board.mts); this file only draws them.
import type { BoardRow } from '../hooks/resident/agent-board.mts';
import type { Colours, Paint } from './statusline-paint.mts';

const LEAD = 'lead';   // what the board calls a session's own entry (agent-board.mts)

/** m:ss, minutes unbounded (`12:03`). */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const shortTarget = (t: string): string => { const parts = t.split('/').filter(Boolean); return parts.length <= 3 ? t : `…/${parts.slice(-3).join('/')}`; };

/** A row's text: the agent, then `Tool m:ss` for a running tool or `idle m:ss`, then its target; quiet rows end `quiet Nm`. */
export function agentSegments(rows: readonly BoardRow[], paint: Paint, c: Colours, lastCommit?: { at: number; who: string } | null, now = 0): string[] {
  const out = rows.filter((r) => r.who === LEAD).map((r) => {   // W8.9: a row a session, never a row an agent: the agents are its project row's count and `claude-packs top`'s
    const hue = r.quiet ? c.amber : c.green;
    const what = r.running ? `${r.tool} ${clock(r.clockMs)}` : `idle ${clock(r.clockMs)}`;
    const target = r.target !== '' ? ` ${paint(shortTarget(r.target).slice(0, 50), c.dim)}` : '';
    const quiet = r.quiet ? ` ${paint(`quiet ${Math.floor(r.silentMs / 60_000)}m`, c.amber)}` : '';
    return `${paint(r.who.padEnd(10), r.quiet ? c.amber : c.lavender)} ${paint('>', c.dim)} ${paint(what, hue)}${target}${quiet}`;
  });
  if (lastCommit && out.length > 0) out.push(paint(`last commit ${Math.floor(Math.max(0, now - lastCommit.at) / 60_000)}m ago, by ${lastCommit.who}`, c.dim));
  return out;
}
