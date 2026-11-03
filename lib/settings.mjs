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
// time-guard, tims-asks and idle-wake were Python and are Node now. A project entry for one only runs it twice, or runs
// a file the project no longer has. Their entries go, and update says so.
export const FORERUNNERS = ['git-guard.py', 'build-guard.py', 'time-guard.py', 'tims-asks.py', 'idle-wake.py'];
export const RETIRED = ['copy-tree-guard.py', 'shell-traps.py', 'gnu-shell.py', 'shell-traps.mjs', 'gnu-shell.mjs', ...FORERUNNERS];

// One node process per settings entry, not one per hook (KWB-24): a group's kit node hooks become one run-hooks.mjs command
// that names them (`node ".../run-hooks.mjs" .claude/hooks/a.mjs .claude/hooks/b.mjs`), in their order, at the first one's
// place, its timeout their sum (60 s at most). An async hook (idle-wake waits for minutes) keeps its own entry, as does
// every hook that is not the kit's node hook (browser-guard.py, the project's own).
export const RUNNER = 'run-hooks.mjs';
const NODE_HOOK = /^node "\$CLAUDE_PROJECT_DIR\/\.claude\/hooks\/([\w-]+\.mjs)"$/;
export function throughRunner(hooks) {
  const runs = (h) => !h.async && !h.asyncRewake && NODE_HOOK.test(h.command ?? '') && h.command.match(NODE_HOOK)[1] !== RUNNER;
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

export function readSettings(claudeDir) {
  const file = join(claudeDir, 'settings.json');
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`.claude/settings.json is not valid JSON (${e.message}); fix it first, nothing was changed`);
  }
}

// `previous`: the paths the last install managed (its lock), so a hook a pack dropped is removed too.
export function syncSettings(claudeDir, packNames, layout = {}, previous = []) {
  const file = join(claudeDir, 'settings.json');
  const settings = readSettings(claudeDir);
  settings.hooks ??= {};
  const ours = new Set([...kitHookScripts(), ...RETIRED]);
  for (const rel of previous) {
    const m = rel.replace(/\\/g, '/').match(/^\.claude\/hooks\/([\w-]+\.(?:mjs|py))$/);
    if (m) ours.add(m[1]);
  }
  const isOurs = (command = '') => ours.has(command.match(SCRIPT)?.[1]);

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
  if (!isDisabled(layout, `hooks/${RUNNER}`)) for (const groups of Object.values(settings.hooks)) for (const g of groups) g.hooks = throughRunner(g.hooks);
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].filter((g) => g.hooks.length > 0);
    if (settings.hooks[event].length === 0) delete settings.hooks[event];
  }
  // layout.siblings: the folders Claude may read and edit besides this project (e.g. "../" for
  // every sibling project), so rolling a lesson out to other projects never stalls on access.
  // Added only; entries the user put there themselves are never removed.
  if (Array.isArray(layout.siblings) && layout.siblings.length) {
    settings.permissions ??= {};
    const dirs = (settings.permissions.additionalDirectories ??= []);
    for (const d of layout.siblings) if (!dirs.includes(d)) dirs.push(d);
  }
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  return { retired: [...retired] };
}
