// Merges the packs' hooks into .claude/settings.json. Hooks this package owns (a command that runs
// a script some pack ships, or one the last install put in .claude/hooks/) are rebuilt from the
// installed packs on every run; every other hook entry, the project's own, stays as it is.
// Kit hooks are node (.mjs); browser-guard.py is the one Python hook left (see README).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readText, slash } from '../packs/base/hooks/lib/files.mts';
import { parseJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import type { Layout } from '../packs/base/hooks/lib/types.d.mts';
import { PICKER, RUNNER, forSettings, runnable, type HookEntry, type HookGroup, type ReadGroup } from './hook-entries.mts';
import { foldEvents, writeHookTable } from './hook-fold.mts';
import { isDisabled, kitHookScripts, readPack } from './packs.mts';

export { HOOK_EXPORT, NODE_HOOK, RUNNER, forSettings, runnable, type HookEntry, type HookGroup } from './hook-entries.mts';
/** `.claude/settings.json`: the hooks, the folders Claude may reach and the status line are the parts the kit writes. */
export interface Settings {
  hooks?: Record<string, HookGroup[]>;
  permissions?: { additionalDirectories?: string[]; [key: string]: unknown };
  statusLine?: unknown;
  [key: string]: unknown;
}
/** What `syncSettings` did: the retired hook scripts it dropped, what became of the status line, and whether it wrote the hook table. */
export interface SyncResult { retired: string[]; statusLine: 'set' | 'kept' | 'removed' | null; table: boolean }

const SCRIPT = /\.claude\/hooks\/([\w-]+\.(?:mjs|py))\b/;
/** The order settings.json lists the events in. */
export const EVENT_ORDER: readonly string[] = ['PreToolUse', 'PostToolUse', 'Stop', 'SessionStart', 'SubagentStop', 'UserPromptSubmit'];
// Hooks a project carried by hand that the kit has taken over elsewhere: copy-tree-guard is merged into
// protect-vendor; shell-traps and gnu-shell are global by design (`claude-packs global add`); git-guard, build-guard,
// time-guard, user-asks and idle-wake were Python and are Node now. A project entry for one only runs it twice, or runs
// a file the project no longer has. Their entries go, and update says so.
// user-asks had a person's name until 0.25.0. A project's settings and `enable` list may still say it.
export const OLD_ASKS = 'tims-asks.mjs';
export const FORERUNNERS: readonly string[] = ['git-guard.py', 'build-guard.py', 'time-guard.py', OLD_ASKS.replace('.mjs', '.py'), 'idle-wake.py'];
export const RETIRED: readonly string[] = ['copy-tree-guard.py', 'shell-traps.py', 'gnu-shell.py', 'shell-traps.mjs', 'gnu-shell.mjs', OLD_ASKS, ...FORERUNNERS];

// One runner entry per event, not one per hook (KWB-24, W8.1): lib/hook-fold.mts. An async hook (idle-wake waits for minutes)
// keeps its own entry, as does every hook that is not the kit's node hook (browser-guard.py, the project's own).

// A runner command of an older install back into one entry per hook it names, so the project's own hooks in it survive the
// rebuild below (the runner itself is the kit's, so its whole command was dropped, and the project's kit-lock with it: KWB-26).
const RUNS = new RegExp(`^node "\\$CLAUDE_PROJECT_DIR/\\.claude/hooks/${RUNNER.replace('.', '\\.')}"((?:\\s+\\S+)+)$`);
export function unfold(hooks: readonly HookEntry[]): HookEntry[] {
  return hooks.flatMap((h) => {
    const names = RUNS.exec(h.command ?? '')?.[1];
    if (names === undefined) return [h];
    return names.trim().split(/\s+/).map((p): HookEntry => ({ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${p.split('/').pop()}"`, timeout: 15 }));
  });
}

/** The project's settings.json; an empty one when it has none. Throws when it is not JSON: nothing is written then. */
export function readSettings(claudeDir: string): Settings {
  const file = join(claudeDir, 'settings.json');
  if (!existsSync(file)) return {};
  const settings = parseJson<Settings>(readText(file));
  if (settings === null) throw new Error('.claude/settings.json is not valid JSON; fix it first, nothing was changed');
  return settings;
}

// The order of an entry's kit hooks is each hook row's `order` in its pack.json (W7 b; it replaced a configuration's hookOrder list,
// which was a hand copy that had lost 14 hooks): the lowest runs first, in the places kit hooks had there; the project's own hooks
// keep theirs; a row with no `order` (a custom pack's) keeps its pack order after the numbered ones.
export function orderHooks(hooks: readonly HookEntry[], isOurs: (command?: string) => boolean): HookEntry[] {
  const places = hooks.flatMap((h, i) => (isOurs(h.command) ? [{ h, i }] : []));
  const rank = (h: HookEntry): number => h.order ?? Number.POSITIVE_INFINITY;
  const sorted = places.map(({ h }, n) => ({ h, n })).sort((a, b) => (rank(a.h) === rank(b.h) ? 0 : rank(a.h) - rank(b.h)) || a.n - b.n);
  const out = [...hooks];
  places.forEach(({ i }, k) => {
    const next = sorted[k];
    if (next) out[i] = next.h;
  });
  return out;
}

// The kit's status line (1.8.0): a pack's "statusLine" goes into settings where the project has none, or has the kit's own
// (its command runs the pack's tool), so a user's own status line is never replaced; `layout.disable` naming the tool takes
// the kit's out again. Returns what it did: 'set', 'kept' (the user's own stays), 'removed' or null.
interface StatusLine { command: string; [field: string]: unknown }
const isStatusLine = (line: unknown): line is StatusLine => typeof line === 'object' && line !== null && 'command' in line && typeof line.command === 'string';
const isKitStatusLine = (line: unknown, tool: string): boolean => isStatusLine(line) && slash(line.command).includes(`.claude/${tool}`);

function syncStatusLine(settings: Settings, packNames: readonly string[], layout: Partial<Layout>): SyncResult['statusLine'] {
  const line = packNames.map((name) => readPack(name).statusLine).find(isStatusLine);
  const tool = line?.command.match(/\.claude\/(tools\/[\w.-]+\.mjs)/)?.[1];
  const ours = tool !== undefined && isKitStatusLine(settings.statusLine, tool);
  if (line && tool !== undefined && !isDisabled(layout, tool)) {
    if (settings.statusLine && !ours) return 'kept';
    settings.statusLine = line;
    return 'set';
  }
  const anyKit = isKitStatusLine(settings.statusLine, 'tools/statusline.mjs');
  if (anyKit) delete settings.statusLine;
  return anyKit ? 'removed' : null;
}

/** Rebuilds the kit's hooks in settings.json from the installed packs and writes it. `previous`: the paths the last install
 *  managed (its lock), so a hook a pack dropped is removed too. */
export function syncSettings(claudeDir: string, packNames: readonly string[], layout: Partial<Layout> = {}, previous: readonly string[] = []): SyncResult {
  const file = join(claudeDir, 'settings.json');
  const settings = readSettings(claudeDir);
  const events: Record<string, ReadGroup[]> = {};
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) events[event] = groups.map((g) => ({ ...g, hooks: unfold(g.hooks ?? []) }));
  const ours = new Set([...kitHookScripts(), ...RETIRED]);
  for (const rel of previous) {
    const m = slash(rel).match(/^\.claude\/hooks\/([\w-]+\.(?:mjs|py))$/);
    if (m?.[1] !== undefined) ours.add(m[1]);
  }
  const isOurs = (command = ''): boolean => ours.has(SCRIPT.exec(command)?.[1] ?? '') || command.includes(PICKER);

  const retired = new Set<string>();
  for (const groups of Object.values(events)) for (const g of groups) for (const h of g.hooks) {
    const s = SCRIPT.exec(h.command ?? '')?.[1];
    if (s !== undefined && RETIRED.includes(s)) retired.add(s);
  }
  for (const [event, groups] of Object.entries(events)) {
    events[event] = groups
      .map((g) => ({ ...g, hooks: g.hooks.filter((h) => !isOurs(h.command)) }))
      .filter((g) => g.hooks.length > 0);
  }

  for (const name of packNames) {
    for (const [event, groups] of Object.entries(readPack(name).hooks ?? {})) {
      const mine = (events[event] ??= []);
      for (const group of groups ?? []) {
        let target = mine.find((g) => g.matcher === group.matcher);
        if (!target) mine.push((target = { matcher: group.matcher, hooks: [] }));
        for (const h of group.hooks) {
          const script = SCRIPT.exec(h.command)?.[1];
          if (script && isDisabled(layout, `hooks/${script}`)) continue;
          if (!target.hooks.some((x) => x.command === h.command)) target.hooks.push(h);
        }
      }
    }
  }
  for (const groups of Object.values(events)) for (const g of groups) g.hooks = orderHooks(g.hooks, isOurs);
  const table = !isDisabled(layout, `hooks/${RUNNER}`);
  if (table) writeHookTable(claudeDir, foldEvents(events, (name) => ours.has(name) && runnable(claudeDir)(name), !isDisabled(layout, 'hooks/bin/hook-proxy')));
  else for (const groups of Object.values(events)) for (const g of groups) g.hooks = g.hooks.map(forSettings);
  for (const event of Object.keys(events)) {
    events[event] = (events[event] ?? []).filter((g) => g.hooks.length > 0);
    if (events[event]?.length === 0) delete events[event];
  }
  // the events in the order of EVENT_ORDER (the one 0.9.x wrote them in); an event it does not name keeps its place after those
  const rank = (e: string): number => (EVENT_ORDER.includes(e) ? EVENT_ORDER.indexOf(e) : EVENT_ORDER.length);
  settings.hooks = Object.fromEntries(Object.entries(events).map((entry, n) => ({ entry, n })).sort((a, b) => rank(a.entry[0]) - rank(b.entry[0]) || a.n - b.n).map((x) => x.entry));
  // layout.siblings: the folders Claude may read and edit besides this project (e.g. "../" for
  // every sibling project), so rolling a lesson out to other projects never stalls on access.
  // Added only; entries the user put there themselves are never removed.
  if (Array.isArray(layout.siblings) && layout.siblings.length) {
    settings.permissions ??= {};
    const dirs = (settings.permissions.additionalDirectories ??= []);
    for (const d of layout.siblings) if (!dirs.includes(d)) dirs.push(d);
  }
  const statusLine = syncStatusLine(settings, packNames, layout);
  if (!writeJson(file, settings, { pretty: true })) throw new Error(`${file} could not be written`);
  return { retired: [...retired], statusLine, table };
}
