// Builds .claude/layout.json from the installed packs, keeping every edit the user made.
// The layout may also hold (all project-owned, never overwritten by an update):
//   "files":     { alias: path }      special files that checks refer to as "@alias"
//   "protected": [globs]              extra read-only paths (vendored copies)
//   "disable":   ["checks/x.json", "hooks/y.mjs", "rules/z.md", "skills/w"]   pack items this project replaces with its own
//   "commands":  { name: "shell command" }   how this project builds, tests and benches (skills use these)
//   "paramIds":  { "extensions", "patterns" }   where param-id-lock reads parameter ids (default: JUCE ParameterID literals)
// A seed layout (a profile, or one written from docs/project.md) is used when no layout exists yet.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPack } from './packs.mjs';

const OWNED = ['files', 'protected', 'disable', 'commands', 'siblings', 'maxFileLines', 'paramIds'];
// "complete": true marks a tailored layout; see below.

export function buildLayout(claudeDir, packNames, seed = null) {
  const file = join(claudeDir, 'layout.json');
  const current = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : (seed ?? {});
  const layout = {
    _comment: 'Where everything lives. folders = the folders; kinds = what goes where (CLAUDE.md shows it, placement-law enforces it); concepts = which rules fire where. Edit here, then run `npx claude-packs update`.',
    folders: { ...(current.folders ?? {}) },
    concepts: { ...(current.concepts ?? {}) },
    kinds: { ...(current.kinds ?? {}) },
  };
  for (const key of OWNED) {
    if (current[key] !== undefined) layout[key] = current[key];
    else if (key !== 'maxFileLines' && key !== 'paramIds') layout[key] = key === 'files' || key === 'commands' ? {} : [];
  }
  // A kind's content pattern that is exactly a pattern the pack used to ship ("contentWas") is
  // replaced by the pack's current one; a pattern the project wrote itself is kept.
  for (const name of packNames) {
    for (const [k, v] of Object.entries(readPack(name).kinds ?? {})) {
      const mine = layout.kinds[k];
      if (mine && v.contentWas?.includes(mine.content)) layout.kinds[k] = { ...mine, content: v.content };
    }
  }
  // A layout marked "complete" (a tailored project) gets no default folders from the packs. It
  // still gains new pack concepts made only of raw globs (no folder names), such as "claude",
  // so a rule added in a later package version always resolves.
  if (current.complete) {
    layout.complete = true;
    for (const name of packNames) {
      for (const [k, v] of Object.entries(readPack(name).concepts ?? {})) {
        if (!layout.concepts[k] && v.every((e) => e.includes('/') || e.includes('*') || e.includes('.'))) layout.concepts[k] = v;
      }
    }
    writeFileSync(file, JSON.stringify(layout, null, 2) + '\n');
    return layout;
  }
  for (const name of packNames) {
    const pack = readPack(name);
    for (const [k, v] of Object.entries(pack.folders ?? {})) layout.folders[k] ??= v;
    for (const [k, v] of Object.entries(pack.files ?? {})) layout.files[k] ??= v;
    for (const [k, { contentWas, ...v }] of Object.entries(pack.kinds ?? {})) layout.kinds[k] ??= v;
    for (const [k, v] of Object.entries(pack.concepts ?? {})) {
      if (!current.concepts?.[k]) layout.concepts[k] = [...new Set([...(layout.concepts[k] ?? []), ...v])];
    }
  }
  writeFileSync(file, JSON.stringify(layout, null, 2) + '\n');
  return layout;
}
