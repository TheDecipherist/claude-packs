// What the daemon draws the status line from (typescript order W8.6): the bar and the pieces it takes as parameters, in one module the
// daemon loads once (hooks/resident/status.mts imports it by path, so a daemon that serves no status ask never reads it).
import { parseJson } from '../hooks/lib/json.mts';
import { kitVersion, runsCache, statusBar } from './statusline.mts';
import { refreshRuns, runsSegments } from './statusline-runs.mts';
import { parseStatusV2 } from './statusline-work.mts';
import { keptNewest } from './statusline-version.mts';

export { kitVersion, keptNewest, parseStatusV2, refreshRuns, runsCache, runsSegments, statusBar };

/** The session's id in Claude Code's status JSON ('' when it carries none): the key of the lead's own activity. */
export const sessionIdOf = (raw: string): string => {
  const id = parseJson<{ session_id?: unknown }>(raw)?.session_id;
  return typeof id === 'string' ? id : '';
};
