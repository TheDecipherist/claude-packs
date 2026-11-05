// Builds .claude/layout.json from the installed packs, keeping every edit the user made.
// The layout may also hold (all project-owned, never overwritten by an update):
//   "files":     { alias: path }      special files that checks refer to as "@alias"
//   "protected": [globs]              extra read-only paths (vendored copies)
//   "buildOutput": [globs]            the build output (default build/**); read-only, as vendored code
//   "writeOnce": [globs]              evidence: a new file may be added, an existing one never changed or removed (KWB-21)
//   "keepWorktrees": [names]          agent worktrees build-sweep never sweeps (the build the user plays)
//   "disable":   ["checks/x.json", "hooks/y.mjs", "rules/z.md", "skills/w"]   pack items this project replaces with its own
//   "commands":  { name: "shell command" }   how this project builds, tests and benches (skills use these)
//   "paramIds":  { "extensions", "patterns" }   where param-id-lock reads parameter ids (default: JUCE ParameterID literals)
//   "enable":    ["hooks/x.py", "checks/y.json"]   pack items this project switches on: opt-in hooks, and hooks or
//                checks a later package version adds to a pack the project already had (see switches.mjs)
//   "sourceFiles": "<regex>"   what is source to folder-law and doctor (written once from the configuration's; KWB-37)
//   "gates":    { "hover": "<command>", "a11y": "<command>" }   the gate that proves the UI's hover (doctor is red for UI code without one; "none: <reason>" declines; 0.10.1)
//   "ruleTests": { "rule-name": "path/to/its/test" | "none: <reason>" }   what answers a rule's named test when no test names the rule (KF-31)
//   "guards":    { "git", "copy", "time", "browser", "images" }   the project's values for the house guards
//                (repo owner and token, the sanctioned copy tools, ...); each hook has its defaults
// A seed layout (a profile, or one written from docs/project.md) is used when no layout exists yet.
// "configuration" names the project's configuration (lib/configs.mjs); its layout template is read like a pack's folders,
// before the packs', so a project gets the folder structure of its kind (0.10.0).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NEW_INSTALL_GIT } from '../packs/base/hooks/lib/git-auth.mjs';
import { readPack } from './packs.mjs';

const OWNED = ['files', 'protected', 'buildOutput', 'writeOnce', 'keepWorktrees', 'disable', 'enable', 'commands', 'siblings', 'maxFileLines', 'paramIds', 'guards', 'sourceFiles', 'gates', 'ruleTests'];
const OPTIONAL = ['maxFileLines', 'paramIds', 'guards', 'buildOutput', 'writeOnce', 'keepWorktrees', 'sourceFiles', 'gates', 'ruleTests'];
// "complete": true marks a tailored layout; see below.

export function buildLayout(claudeDir, packNames, seed = null, config = null) {
  const file = join(claudeDir, 'layout.json');
  const firstInstall = !existsSync(file);
  const current = firstInstall ? (seed ?? {}) : JSON.parse(readFileSync(file, 'utf8'));
  // A project already installed changes only through "enable": "guards/git-house".
  if (firstInstall) current.guards = { ...current.guards, git: { ...NEW_INSTALL_GIT, ...current.guards?.git } };
  const layout = {
    _comment: 'Where everything lives. folders = the folders; kinds = what goes where (CLAUDE.md shows it, placement-law enforces it); concepts = which rules fire where. Edit here, then run `npx --no-install @thedecipherist/claude-packs update`.',
    ...(config ? { configuration: config.name } : current.configuration ? { configuration: current.configuration } : {}),
    folders: { ...(current.folders ?? {}) },
    concepts: { ...(current.concepts ?? {}) },
    kinds: { ...(current.kinds ?? {}) },
  };
  for (const key of OWNED) {
    if (current[key] !== undefined) layout[key] = current[key];
    else if (!OPTIONAL.includes(key)) layout[key] = key === 'files' || key === 'commands' ? {} : [];
  }
  // A kind's content pattern that is exactly a pattern the pack used to ship ("contentWas") is
  // replaced by the pack's current one; a pattern the project wrote itself is kept.
  // "sourceFiles" (what folder-law and doctor count as source; KWB-37) comes from the configuration once, then is the project's
  if (config?.sourceFiles && layout.sourceFiles === undefined) layout.sourceFiles = config.sourceFiles;
  const sources = [...(config?.layout ? [config.layout] : []), ...packNames.map(readPack)];
  for (const pack of sources) {
    for (const [k, v] of Object.entries(pack.kinds ?? {})) {
      const mine = layout.kinds[k];
      if (mine && v.contentWas?.includes(mine.content)) layout.kinds[k] = { ...mine, content: v.content };
    }
  }
  // A layout marked "complete" (a tailored project) gets no default folders from the packs. It
  // still gains new pack concepts made only of raw globs (no folder names), such as "claude",
  // so a rule added in a later package version always resolves.
  if (current.complete) {
    layout.complete = true;
    for (const pack of sources) {
      for (const [k, v] of Object.entries(pack.concepts ?? {})) {
        if (!layout.concepts[k] && v.every((e) => e.startsWith('kind:') || e.includes('/') || e.includes('*') || e.includes('.'))) layout.concepts[k] = v;
      }
    }
    writeFileSync(file, JSON.stringify(layout, null, 2) + '\n');
    return layout;
  }
  for (const pack of sources) {
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
