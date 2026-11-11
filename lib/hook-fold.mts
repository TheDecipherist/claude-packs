// One runner per event (typescript order W8.1, d-9): the kit's node hooks of an event leave their matcher groups and become one
// blocking entry, `node ".../run-hooks.mjs"`, whose matcher is the union of theirs (a project that has no hook on a tool starts
// nothing on it); every row they came from goes to the table the runner reads (.claude/hooks/hooks.json). A hook that is async or
// asyncRewake (heartbeat, idle-wake), one that does not export `hook` and the project's own hooks keep their own entries.
import { join } from 'node:path';
import { ensureDir } from '../packs/base/hooks/lib/files.mts';
import { unionMatcher, TABLE_FILE } from '../packs/base/hooks/lib/hook-table.mts';
import { writeJson } from '../packs/base/hooks/lib/json.mts';
import type { HookEventName, HookTableRow } from '../packs/base/hooks/lib/types.d.mts';
import { RUNNER, forSettings, nodeScript, type HookEntry, type ReadGroup } from './hook-entries.mts';

const rowOf = (event: string, matcher: string | undefined, h: HookEntry, script: string): HookTableRow => ({
  hook: script.replace(/\.mjs$/, ''),
  events: [event as HookEventName],
  ...(matcher !== undefined ? { matcher } : {}),
  ...(h.timeout !== undefined ? { timeout: h.timeout } : {}),
  ...(h.async ? { async: true } : {}),
  ...(h.asyncRewake ? { asyncRewake: true } : {}),
  ...(h.order !== undefined ? { order: h.order } : {}),
  role: h.role === 'recorder' ? 'recorder' : 'judge',
});

// A hook with the same matcher, timeout, order and role in two events is one row naming both.
const sameRow = (a: HookTableRow, b: HookTableRow): boolean => JSON.stringify({ ...a, events: 0 }) === JSON.stringify({ ...b, events: 0 });
function addRow(rows: HookTableRow[], row: HookTableRow): void {
  const twin = rows.findIndex((r) => sameRow(r, row));
  const found = rows[twin];
  if (found === undefined) rows.push(row);
  else rows[twin] = { ...found, events: [...found.events, ...row.events.filter((e) => !found.events.includes(e))] };
}

const runnerEntry = (timeouts: readonly number[]): HookEntry => ({
  type: 'command',
  command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${RUNNER}"`,
  timeout: Math.min(60, timeouts.reduce((a, t) => a + t, 0)),
});

/** Folds each event's kit hooks that `canFold` takes (the kit's own, and written for the runner: a project's own hook keeps its entry) into its one runner entry, in place, and returns the table's rows. The runner entry takes
 *  the place of the first group that held one of them; its matcher is their union. */
export function foldEvents(events: Record<string, ReadGroup[]>, canFold: (name: string) => boolean = () => true): HookTableRow[] {
  const rows: HookTableRow[] = [];
  for (const [event, groups] of Object.entries(events)) {
    const folded: HookTableRow[] = [];
    const out: ReadGroup[] = [];
    let at = -1;
    for (const g of groups) {
      const rest: HookEntry[] = [];
      for (const h of g.hooks) {
        const script = nodeScript(h);
        if (script === undefined || script === RUNNER || !canFold(script)) { rest.push(forSettings(h)); continue; }
        const row = rowOf(event, g.matcher, h, script);
        addRow(rows, row);
        if (h.async || h.asyncRewake) { rest.push(forSettings(h)); continue; }
        folded.push(row);
        if (at < 0) at = out.length;
      }
      if (rest.length > 0) out.push({ ...g, hooks: rest });
    }
    if (folded.length > 0) {
      const matcher = unionMatcher(folded.map((r) => r.matcher));
      out.splice(at, 0, { ...(matcher !== undefined ? { matcher } : {}), hooks: [runnerEntry(folded.map((r) => r.timeout ?? 10))] });
    }
    events[event] = out;
  }
  return rows;
}

/** Writes the table beside the hooks. */
export function writeHookTable(claudeDir: string, rows: readonly HookTableRow[]): void {
  ensureDir(join(claudeDir, 'hooks'));
  if (!writeJson(join(claudeDir, 'hooks', TABLE_FILE), rows, { pretty: true })) throw new Error(`${join(claudeDir, 'hooks', TABLE_FILE)} could not be written`);
}
