const LEAD = 'lead'; // what the board calls a session's own entry (agent-board.mts)
/** m:ss, minutes unbounded (`12:03`). */
export function clock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
const shortTarget = (t) => { const parts = t.split('/').filter(Boolean); return parts.length <= 3 ? t : `…/${parts.slice(-3).join('/')}`; };
/** A row's text: the agent, then `Tool m:ss` for a running tool or `idle m:ss`, then its target; quiet rows end `quiet Nm`. */
export function agentSegments(rows, paint, c, lastCommit, now = 0) {
    const out = rows.filter((r) => r.who === LEAD).map((r) => {
        const hue = r.quiet ? c.amber : c.green;
        const what = r.running ? `${r.tool} ${clock(r.clockMs)}` : `idle ${clock(r.clockMs)}`;
        const target = r.target !== '' ? ` ${paint(shortTarget(r.target).slice(0, 50), c.dim)}` : '';
        const quiet = r.quiet ? ` ${paint(`quiet ${Math.floor(r.silentMs / 60_000)}m`, c.amber)}` : '';
        return `${paint(r.who.padEnd(10), r.quiet ? c.amber : c.lavender)} ${paint('>', c.dim)} ${paint(what, hue)}${target}${quiet}`;
    });
    if (lastCommit && out.length > 0)
        out.push(paint(`last commit ${Math.floor(Math.max(0, now - lastCommit.at) / 60_000)}m ago, by ${lastCommit.who}`, c.dim));
    return out;
}
