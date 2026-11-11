// Merges the packs' hooks into .claude/settings.json. Hooks this package owns (a command that runs
// a script some pack ships, or one the last install put in .claude/hooks/) are rebuilt from the
// installed packs on every run; every other hook entry, the project's own, stays as it is.
// Kit hooks are node (.mjs); browser-guard.py is the one Python hook left (see README).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDisabled, kitHookScripts, readPack } from './packs.mjs';

const SCRIPT = /\.claude\/hooks\/([\w-]+\.(?:mjs|py))\b/;
// Hooks a project carried by hand that the kit has taken over elsewhere: copy-tree-guard is merged into
// protect-vendor; shell-traps and gnu-shell are global by design (`claude-packs global add`); git-guard, build-guard,
// time-guard, user-asks and idle-wake were Python and are Node now. A project entry for one only runs it twice, or runs
// a file the project no longer has. Their entries go, and update says so.
// user-asks had a person's name until 0.25.0. A project's settings and `enable` list may still say it.
export const OLD_ASKS = 'tims-asks.mjs';
export const FORERUNNERS = ['git-guard.py', 'build-guard.py', 'time-guard.py', OLD_ASKS.replace('.mjs', '.py'), 'idle-wake.py'];
export const RETIRED = ['copy-tree-guard.py', 'shell-traps.py', 'gnu-shell.py', 'shell-traps.mjs', 'gnu-shell.mjs', OLD_ASKS, ...FORERUNNERS];

// One node process per settings entry, not one per hook (KWB-24): a group's kit node hooks become one run-hooks.mjs command
// that names them (`node ".../run-hooks.mjs" .claude/hooks/a.mjs .claude/hooks/b.mjs`), in their order, at the first one's
// place, its timeout their sum (60 s at most). An async hook (idle-wake waits for minutes) keeps its own entry, as does
// every hook that is not the kit's node hook (browser-guard.py, the project's own).
export const RUNNER = 'run-hooks.mjs';
const NODE_HOOK = /^node "\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/([\w-]+\.mjs)"$/;
// Only a hook written for the runner (it exports hook(text)) is folded in; any other node hook keeps its own entry: the kit
// repo's own kit-lock was folded in, failed there as exit 1 and never refused (KWB-26).
const HOOK_EXPORT = /export\s+(?:const|let|function|async\s+function)\s+hook\b|export\s*\{[^}]*\bhook\b[^}]*\}/;
export const runnable = (claudeDir) => (name) => { try { return HOOK_EXPORT.test(readFileSync(join(claudeDir, 'hooks', name), 'utf8')); } catch { return false; } };
export function throughRunner(hooks, canRun = () => true) {
  const runs = (h) => !h.async && !h.asyncRewake && NODE_HOOK.test(h.command ?? '') && h.command.match(NODE_HOOK)[1] !== RUNNER && canRun(h.command.match(NODE_HOOK)[1]);
  const kit = hooks.filter(runs);
  if (!kit.length) return hooks;
  const at = hooks.indexOf(kit[0]);
  const runner = {
    type: 'command',
    command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${RUNNER}" ${kit.map((h) => `.claude/hooks/${h.command.match(NODE_HOOK)[1]}`).join(' ')}`,
    timeout: Math.min(60, kit.reduce((a, h) => a + (h.timeout ?? 10), 0)),
  };
  const rest = hooks.filter((h) => !runs(h));
  rest.splice(Math.min(at, rest.length), 0, runner);
  return rest;
}

// A runner command back into one entry per hook it names, so the project's own hooks in it survive the rebuild below (the
// runner itself is the kit's, so its whole command was dropped, and the project's kit-lock with it: KWB-26).
const RUNS = new RegExp(`^node "\\$CLAUDE_PROJECT_DIR/\\.claude/hooks/${RUNNER.replace('.', '\\.')}"((?:\\s+\\S+)+)$`);
export function unfold(hooks) {
  return hooks.flatMap((h) => {
    const m = (h.command ?? '').match(RUNS);
    if (!m) return [h];
    return m[1].trim().split(/\s+/).map((p) => ({ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${p.split('/').pop()}"`, timeout: 15 }));
  });
}

export function readSettings(claudeDir) {
  const file = join(claudeDir, 'settings.json');
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`.claude/settings.json is not valid JSON (${e.message}); fix it first, nothing was changed`);
  }
}

// A configuration's "hookOrder" ({ "<event> <matcher>": [script, ...] }; no matcher: "<event>") puts the kit hooks of an entry
// in that order, in the places kit hooks had there; the project's own hooks keep theirs; a script it does not list keeps its
// pack order after the listed ones (0.10.0: moving a hook into another pack does not reorder a project's settings).
export function orderHooks(hooks, order, isOurs) {
  if (!order?.length) return hooks;
  const at = hooks.map((h, i) => (isOurs(h.command) ? i : -1)).filter((i) => i >= 0);
  const rank = (h) => { const i = order.indexOf(h.command.match(SCRIPT)?.[1]); return i < 0 ? order.length : i; };
  const sorted = at.map((i) => hooks[i]).map((h, n) => ({ h, n })).sort((a, b) => rank(a.h) - rank(b.h) || a.n - b.n).map((x) => x.h);
  const out = [...hooks];
  at.forEach((i, n) => { out[i] = sorted[n]; });
  return out;
}

// The kit's status line (1.8.0): a pack's "statusLine" goes into settings where the project has none, or has the kit's own
// (its command runs the pack's tool), so a user's own status line is never replaced; `layout.disable` naming the tool takes
// the kit's out again. Returns what it did: 'set', 'kept' (the user's own stays), 'removed' or null.
const isKitStatusLine = (line, tool) => typeof line?.command === 'string' && line.command.replace(/\\/g, '/').includes(`.claude/${tool}`);

function syncStatusLine(settings, packNames, layout) {
  const pack = packNames.map((name) => ({ line: readPack(name).statusLine })).find((p) => p.line);
  const tool = pack?.line.command.match(/\.claude\/(tools\/[\w.-]+\.mjs)/)?.[1];
  const ours = tool && isKitStatusLine(settings.statusLine, tool);
  if (pack && tool && !isDisabled(layout, tool)) {
    if (settings.statusLine && !ours) return 'kept';
    settings.statusLine = pack.line;
    return 'set';
  }
  const anyKit = isKitStatusLine(settings.statusLine, 'tools/statusline.mjs');
  if (anyKit) delete settings.statusLine;
  return anyKit ? 'removed' : null;
}

// `previous`: the paths the last install managed (its lock), so a hook a pack dropped is removed too.
export function syncSettings(claudeDir, packNames, layout = {}, previous = [], hookOrder = {}) {
  const file = join(claudeDir, 'settings.json');
  const settings = readSettings(claudeDir);
  settings.hooks ??= {};
  const ours = new Set([...kitHookScripts(), ...RETIRED]);
  for (const rel of previous) {
    const m = rel.replace(/\\/g, '/').match(/^\.claude\/hooks\/([\w-]+\.(?:mjs|py))$/);
    if (m) ours.add(m[1]);
  }
  const isOurs = (command = '') => ours.has(command.match(SCRIPT)?.[1]);

  for (const groups of Object.values(settings.hooks)) for (const g of groups) g.hooks = unfold(g.hooks ?? []);
  const retired = new Set();
  for (const groups of Object.values(settings.hooks)) for (const g of groups) for (const h of g.hooks ?? []) {
    const s = h.command?.match(SCRIPT)?.[1];
    if (RETIRED.includes(s)) retired.add(s);
  }
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event]
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !isOurs(h.command)) }))
      .filter((g) => g.hooks.length > 0);
  }

  for (const name of packNames) {
    for (const [event, groups] of Object.entries(readPack(name).hooks ?? {})) {
      settings.hooks[event] ??= [];
      for (const group of groups) {
        let target = settings.hooks[event].find((g) => g.matcher === group.matcher);
        if (!target) settings.hooks[event].push((target = { matcher: group.matcher, hooks: [] }));
        for (const h of group.hooks) {
          const script = h.command.match(SCRIPT)?.[1];
          if (script && isDisabled(layout, `hooks/${script}`)) continue;
          if (!target.hooks.some((x) => x.command === h.command)) target.hooks.push(h);
        }
      }
    }
  }
  for (const [event, groups] of Object.entries(settings.hooks)) for (const g of groups) g.hooks = orderHooks(g.hooks, hookOrder?.[g.matcher === undefined ? event : `${event} ${g.matcher}`], isOurs);
  if (!isDisabled(layout, `hooks/${RUNNER}`)) for (const groups of Object.values(settings.hooks)) for (const g of groups) g.hooks = throughRunner(g.hooks, runnable(claudeDir));
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter((g) => g.hooks.length > 0);
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }
  // the events in the order the configuration's hookOrder names them (a fresh install of 0.10.0 writes them as 0.9.x did)
  const events = [...new Set(Object.keys(hookOrder ?? {}).map((k) => k.split(' ')[0]))];
  if (events.length) {
    const rank = (e) => (events.includes(e) ? events.indexOf(e) : events.length);
    settings.hooks = Object.fromEntries(Object.entries(settings.hooks).map((x, n) => [x, n]).sort(([[a], i], [[b], j]) => rank(a) - rank(b) || i - j).map(([x]) => x));
  }
  // layout.siblings: the folders Claude may read and edit besides this project (e.g. "../" for
  // every sibling project), so rolling a lesson out to other projects never stalls on access.
  // Added only; entries the user put there themselves are never removed.
  if (Array.isArray(layout.siblings) && layout.siblings.length) {
    settings.permissions ??= {};
    const dirs = (settings.permissions.additionalDirectories ??= []);
    for (const d of layout.siblings) if (!dirs.includes(d)) dirs.push(d);
  }
  const statusLine = syncStatusLine(settings, packNames, layout);
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  return { retired: [...retired], statusLine };
}
