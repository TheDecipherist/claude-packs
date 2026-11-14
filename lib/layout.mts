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
//   "followFolders": true   base's language concepts cover every code folder of the layout. A first install writes it; an older project chooses it
//   "looks":    [{ name, reference, code, report }]   the pages drawn from a reference picture, for look-gate (KWB-92)
//   "guards":    { "git", "copy", "time", "browser", "images" }   the project's values for the house guards
//                (repo owner and token, the sanctioned copy tools, ...); each hook has its defaults
// A seed layout (a profile, or one written from docs/project.md) is used when no layout exists yet.
// "configuration" names the project's configuration (lib/configs.mts); its layout template is read like a pack's folders,
// before the packs', so a project gets the folder structure of its kind (0.10.0).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { NEW_INSTALL_GIT } from '../packs/base/hooks/lib/git-auth.mts';
import { parseJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import { codeFolders } from '../packs/base/hooks/lib/layout.mts';
import type { Configuration, Layout, LayoutKind } from '../packs/base/hooks/lib/types.d.mts';
import { readPack } from './packs.mts';

export const OWNED: readonly string[] = ['files', 'protected', 'buildOutput', 'writeOnce', 'keepWorktrees', 'disable', 'enable', 'commands', 'siblings', 'maxFileLines', 'paramIds',
  'guards', 'sourceFiles', 'gates', 'ruleTests', 'followFolders', 'looks', 'chart', 'settingsLayer', 'catalog', 'docsFolder'];
const OPTIONAL: readonly string[] = ['maxFileLines', 'paramIds', 'guards', 'buildOutput', 'writeOnce', 'keepWorktrees', 'sourceFiles', 'gates', 'ruleTests', 'followFolders', 'looks', 'chart',
  'settingsLayer', 'catalog', 'docsFolder'];   // KWB-144: written only when the project has it
// "complete": true marks a tailored layout; see below.

/** A kind as a pack or configuration ships it: "contentWas" lists the content patterns it used to ship (they are replaced, a project's own is kept). */
type TemplateKind = LayoutKind & { contentWas?: readonly unknown[] };

/** The layout as built here: its kinds are always present. */
type BuiltLayout = Layout & { kinds: Record<string, LayoutKind> };

// Base's language concepts name folders, where every other language's are `**`: a file in a layout folder could be legal and have no rules (KWB-83).
// `**` would close that and hide a stray file from doctor --strict, so the concept follows the layout instead: a folder in it gets its rules, and one outside stays reported.
const FOLLOWED: Readonly<Record<string, readonly string[]>> = { cpp: ['c', 'cc', 'cpp', 'cxx', 'h', 'hh', 'hpp', 'mm'], js: ['{js,mjs,cjs,jsx,ts,tsx}'] };

function followFolders(layout: Layout): void {
  for (const [concept, extensions] of Object.entries(FOLLOWED)) {
    const entries = layout.concepts[concept];
    if (!entries) continue;
    const globs = codeFolders(layout).flatMap((folder) => extensions.map((ext) => `${folder}/**/*.${ext}`));
    layout.concepts[concept] = [...new Set([...entries, ...globs])];
  }
}

/** The kinds a template (a pack, or the configuration's layout) declares. */
const kindsOf = (source: { kinds?: Record<string, LayoutKind> }): [string, TemplateKind][] => Object.entries(source.kinds ?? {});

/** Writes the project's layout.json from what it holds, the seed (a first install) and the packs' templates; returns the layout. */
export function buildLayout(claudeDir: string, packNames: readonly string[], seed: Partial<Layout> | null = null, config: Configuration | null = null): Layout {
  const file = join(claudeDir, 'layout.json');
  const firstInstall = !existsSync(file);
  const current: Partial<Layout> = firstInstall ? (seed ?? {}) : (parseJson<Partial<Layout>>(readText(file)) ?? failedRead(file));
  // A project already installed changes only through "enable": "guards/git-house".
  if (firstInstall) {
    const git = current.guards?.git;
    current.guards = { ...current.guards, git: { ...NEW_INSTALL_GIT, ...(typeof git === 'object' && git !== null ? git : {}) } };
  }
  // The key is the choice: a new install is held to its rules' named tests, and one already installed is told, until it adds the key.
  if (firstInstall) current.ruleTests ??= {};
  if (firstInstall && !current.complete) current.followFolders ??= true;
  const layout: BuiltLayout = {
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
  const files = (layout.files ??= {});   // set above (not optional); the guard is for the type
  // A kind's content pattern that is exactly a pattern the pack used to ship ("contentWas") is
  // replaced by the pack's current one; a pattern the project wrote itself is kept.
  // "sourceFiles" (what folder-law and doctor count as source; KWB-37) comes from the configuration once, then is the project's
  if (config?.sourceFiles && layout.sourceFiles === undefined) layout.sourceFiles = config.sourceFiles;
  const packs = packNames.map(readPack);
  const sources = [...(config?.layout ? [config.layout] : []), ...packs];
  // The configuration's template seeds folders and concepts on a first install, or when the project takes that configuration;
  // a project already of it owns its layout, and a later template never writes into it (KWB-97: full-stack's packages/ tree
  // gave a project with channel/ a second web app folder). A pack's own folders and concepts still come with the pack.
  const seeding = config?.layout && (firstInstall || current.configuration !== config.name) ? sources : packs;
  for (const pack of sources) {
    for (const [k, v] of kindsOf(pack)) {
      const mine = layout.kinds[k];
      if (mine && v.contentWas?.includes(mine.content)) layout.kinds[k] = { ...mine, content: v.content };
    }
  }
  // A layout marked "complete" (a tailored project) gets no default folders from the packs. It
  // still gains new pack concepts made only of raw globs (no folder names), such as "claude",
  // so a rule added in a later package version always resolves.
  if (current.complete) {
    layout.complete = true;
    for (const pack of seeding) {
      for (const [k, v] of Object.entries(pack.concepts ?? {})) {
        if (!layout.concepts[k] && v.every((e) => e.startsWith('kind:') || e.includes('/') || e.includes('*') || e.includes('.'))) layout.concepts[k] = v;
      }
    }
    save(file, layout);
    return layout;
  }
  for (const pack of seeding) {
    for (const [k, v] of Object.entries(pack.folders ?? {})) layout.folders[k] ??= v;
    for (const [k, v] of stringEntries(pack.files)) files[k] ??= v;
    for (const [k, { contentWas, ...v }] of kindsOf(pack)) layout.kinds[k] ??= v;
    for (const [k, v] of Object.entries(pack.concepts ?? {})) {
      if (!current.concepts?.[k]) layout.concepts[k] = [...new Set([...(layout.concepts[k] ?? []), ...v])];
    }
  }
  if (layout.followFolders) followFolders(layout);
  save(file, layout);
  return layout;
}

/** layout.json written whole; a write the disk refuses stops the install, as it always did. */
function save(file: string, layout: Layout): void {
  if (!writeJson(file, layout, { pretty: true })) throw new Error(`${file} could not be written`);
}

/** The string entries of a pack's `files` map ({ alias: path }); anything else it holds is not a path. */
function stringEntries(value: unknown): [string, string][] {
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).filter((e): e is [string, string] => typeof e[1] === 'string');
}

/** An existing layout.json that cannot be read stops the install, as it always did: it is never replaced by an empty one. */
function failedRead(file: string): never {
  throw new Error(`${file} is not valid JSON; fix it first, nothing was changed`);
}
