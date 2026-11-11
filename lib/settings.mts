// Merges the packs' hooks into .claude/settings.json. Hooks this package owns (a command that runs
// a script some pack ships, or one the last install put in .claude/hooks/) are rebuilt from the
// installed packs on every run; every other hook entry, the project's own, stays as it is.
// Kit hooks are node (.mjs); browser-guard.py is the one Python hook left (see README).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { parseJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import type { Layout } from '../packs/base/hooks/lib/types.d.mts';
import { isDisabled, kitHookScripts, readPack } from './packs.mts';

/** One hook entry of settings.json as the project holds it (user data: every field may be missing). The kit's own `role` and
 *  `order` come from a pack.json row and never reach a project's settings. */
export interface HookEntry { type?: string; command?: string; timeout?: number; async?: boolean; asyncRewake?: boolean; role?: string; order?: number }
/** One matcher group of settings.json. */
export interface HookGroup { matcher?: string; hooks?: HookEntry[] }
/** One matcher group once it has been read: its hooks are always a list. */
type ReadGroup = { matcher?: string; hooks: HookEntry[] };
/** `.claude/settings.json`: the hooks, the folders Claude may reach and the status line are the parts the kit writes. */
export interface Settings {
  hooks?: Record<string, HookGroup[]>;
  permissions?: { additionalDirectories?: string[]; [key: string]: unknown };
  statusLine?: unknown;
  [key: string]: unknown;
}
/** What `syncSettings` did: the retired hook scripts it dropped, and what became of the status line. */
export interface SyncResult { retired: string[]; statusLine: 'set' | 'kept' | 'removed' | null }

const SCRIPT = /\.claude\/hooks\/([\w-]+\.(?:mjs|py))\b/;
// Hooks a project carried by hand that the kit has taken over elsewhere: copy-tree-guard is merged into
// protect-vendor; shell-traps and gnu-shell are global by design (`claude-packs global add`); git-guard, build-guard,
// time-guard, user-asks and idle-wake were Python and are Node now. A project entry for one only runs it twice, or runs
// a file the project no longer has. Their entries go, and update says so.
// user-asks had a person's name until 0.25.0. A project's settings and `enable` list may still say it.
export const OLD_ASKS = 'tims-asks.mjs';
export const FORERUNNERS: readonly string[] = ['git-guard.py', 'build-guard.py', 'time-guard.py', OLD_ASKS.replace('.mjs', '.py'), 'idle-wake.py'];
export const RETIRED: readonly string[] = ['copy-tree-guard.py', 'shell-traps.py', 'gnu-shell.py', 'shell-traps.mjs', 'gnu-shell.mjs', OLD_ASKS, ...FORERUNNERS];

// One node process per settings entry, not one per hook (KWB-24): a group's kit node hooks become one run-hooks.mjs command
// that names them (`node ".../run-hooks.mjs" .claude/hooks/a.mjs .claude/hooks/b.mjs`), in their order, at the first one's
// place, its timeout their sum (60 s at most). An async hook (idle-wake waits for minutes) keeps its own entry, as does
// every hook that is not the kit's node hook (browser-guard.py, the project's own).
export const RUNNER = 'run-hooks.mjs';
export const NODE_HOOK = /^node "\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/([\w-]+\.mjs)"$/;
// Only a hook written for the runner (it exports hook: `hook(text)`, or `hook(event, ctx)` on the new contract) is folded
// in; any other node hook keeps its own entry: the kit repo's own kit-lock was folded in, failed there as exit 1 and never
// refused (KWB-26).
export const HOOK_EXPORT = /export\s+(?:const|let|function|async\s+function)\s+hook\b|export\s*\{[^}]*\bhook\b[^}]*\}/;

/** Whether the installed hook file of this name exports `hook`, so the runner can run it. */
export const runnable = (claudeDir: string) => (name: string): boolean => HOOK_EXPORT.test(readText(join(claudeDir, 'hooks', name)) ?? '');

const nodeScript = (h: HookEntry): string | undefined => NODE_HOOK.exec(h.command ?? '')?.[1];

/** A group's hooks with every runnable kit node hook folded into one runner command at the first one's place. */
export function throughRunner(hooks: readonly HookEntry[], canRun: (name: string) => boolean = () => true): HookEntry[] {
  const scriptOf = (h: HookEntry): string | undefined => {
    const name = h.async || h.asyncRewake ? undefined : nodeScript(h);
    return name !== undefined && name !== RUNNER && canRun(name) ? name : undefined;
  };
  const kit = hooks.filter((h) => scriptOf(h) !== undefined);
  const first = kit[0];
  if (first === undefined) return hooks.map(forSettings);
  const at = hooks.indexOf(first);
  const runner: HookEntry = {
    type: 'command',
    command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${RUNNER}" ${kit.map((h) => `.claude/hooks/${scriptOf(h)}`).join(' ')}`,
    timeout: Math.min(60, kit.reduce((a, h) => a + (h.timeout ?? 10), 0)),
  };
  const rest = hooks.filter((h) => scriptOf(h) === undefined).map(forSettings);
  rest.splice(Math.min(at, rest.length), 0, runner);
  return rest;
}
// What only the kit reads in a pack.json hook row (its role, its order: W4, W8.1) never reaches a project's settings.json.
const KIT_ONLY = new Set(['role', 'order']);
/** A hook entry as settings.json holds it: without the keys only the kit reads. */
export const forSettings = (h: HookEntry): HookEntry => Object.fromEntries(Object.entries(h).filter(([k]) => !KIT_ONLY.has(k)));

// A runner command back into one entry per hook it names, so the project's own hooks in it survive the rebuild below (the
// runner itself is the kit's, so its whole command was dropped, and the project's kit-lock with it: KWB-26).
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

// A configuration's "hookOrder" ({ "<event> <matcher>": [script, ...] }; no matcher: "<event>") puts the kit hooks of an entry
// in that order, in the places kit hooks had there; the project's own hooks keep theirs; a script it does not list keeps its
// pack order after the listed ones (0.10.0: moving a hook into another pack does not reorder a project's settings).
export function orderHooks(hooks: readonly HookEntry[], order: readonly string[] | undefined, isOurs: (command?: string) => boolean): HookEntry[] {
  if (!order?.length) return [...hooks];
  const places = hooks.flatMap((h, i) => (isOurs(h.command) ? [{ h, i }] : []));
  const rank = (h: HookEntry): number => {
    const i = order.indexOf(SCRIPT.exec(h.command ?? '')?.[1] ?? '');
    return i < 0 ? order.length : i;
  };
  const sorted = places.map(({ h }, n) => ({ h, n })).sort((a, b) => rank(a.h) - rank(b.h) || a.n - b.n);
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
const isKitStatusLine = (line: unknown, tool: string): boolean => isStatusLine(line) && line.command.replace(/\\/g, '/').includes(`.claude/${tool}`);

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
export function syncSettings(claudeDir: string, packNames: readonly string[], layout: Partial<Layout> = {}, previous: readonly string[] = [], hookOrder: Record<string, readonly string[]> = {}): SyncResult {
  const file = join(claudeDir, 'settings.json');
  const settings = readSettings(claudeDir);
  const events: Record<string, ReadGroup[]> = {};
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) events[event] = groups.map((g) => ({ ...g, hooks: unfold(g.hooks ?? []) }));
  const ours = new Set([...kitHookScripts(), ...RETIRED]);
  for (const rel of previous) {
    const m = rel.replace(/\\/g, '/').match(/^\.claude\/hooks\/([\w-]+\.(?:mjs|py))$/);
    if (m?.[1] !== undefined) ours.add(m[1]);
  }
  const isOurs = (command = ''): boolean => ours.has(SCRIPT.exec(command)?.[1] ?? '');

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
  for (const [event, groups] of Object.entries(events)) for (const g of groups) g.hooks = orderHooks(g.hooks, hookOrder[g.matcher === undefined ? event : `${event} ${g.matcher}`], isOurs);
  if (!isDisabled(layout, `hooks/${RUNNER}`)) for (const groups of Object.values(events)) for (const g of groups) g.hooks = throughRunner(g.hooks, runnable(claudeDir));
  for (const event of Object.keys(events)) {
    events[event] = (events[event] ?? []).filter((g) => g.hooks.length > 0);
    if (events[event]?.length === 0) delete events[event];
  }
  // the events in the order the configuration's hookOrder names them (a fresh install of 0.10.0 writes them as 0.9.x did)
  const named = [...new Set(Object.keys(hookOrder).map((k) => k.split(' ')[0] ?? ''))];
  const rank = (e: string): number => (named.includes(e) ? named.indexOf(e) : named.length);
  settings.hooks = named.length
    ? Object.fromEntries(Object.entries(events).map((entry, n) => ({ entry, n })).sort((a, b) => rank(a.entry[0]) - rank(b.entry[0]) || a.n - b.n).map((x) => x.entry))
    : events;
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
  return { retired: [...retired], statusLine };
}
