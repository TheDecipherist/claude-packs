// Merges the packs' hooks into .claude/settings.json. Hooks this package owns (commands under
// .claude/hooks/) are rebuilt from the installed packs on every run; the user's own hooks stay.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDisabled, readPack } from './packs.mjs';

const OURS = /\.claude\/hooks\/[\w-]+\.mjs/;

export function readSettings(claudeDir) {
  const file = join(claudeDir, 'settings.json');
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`.claude/settings.json is not valid JSON (${e.message}); fix it first, nothing was changed`);
  }
}

export function syncSettings(claudeDir, packNames, layout = {}) {
  const file = join(claudeDir, 'settings.json');
  const settings = readSettings(claudeDir);
  settings.hooks ??= {};

  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event]
      .map((g) => ({ ...g, hooks: g.hooks.filter((h) => !OURS.test(h.command ?? '')) }))
      .filter((g) => g.hooks.length > 0);
  }

  for (const name of packNames) {
    for (const [event, groups] of Object.entries(readPack(name).hooks ?? {})) {
      settings.hooks[event] ??= [];
      for (const group of groups) {
        let target = settings.hooks[event].find((g) => g.matcher === group.matcher);
        if (!target) settings.hooks[event].push((target = { matcher: group.matcher, hooks: [] }));
        for (const h of group.hooks) {
          const script = h.command.match(/hooks\/([\w-]+\.mjs)/)?.[1];
          if (script && isDisabled(layout, `hooks/${script}`)) continue;
          if (!target.hooks.some((x) => x.command === h.command)) target.hooks.push(h);
        }
      }
    }
  }
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
}
