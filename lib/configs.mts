// Configurations (0.10.0, STEP 3; KWB-31): a kind of project, as data. A configuration is configurations/shared.json (what every
// kind holds: the always packs, the shared folders and kinds, the house rules) with the deltas of configurations/<name>/config.json
// laid over it (lib/config-merge.mts says how); readConfig makes the whole of it:
//   "packs":     { "always": [...], "choose": [...], "default": [...] }  the packs it always installs (base first), the ones
//                a project may add (every pack whose pack.json `fits` names it), and the ones `init --config <name>` takes
//   "layout":    { "folders", "concepts", "kinds" }   the layout template: the folder structure of that kind of project
//   "leaveOut":  ["rules/x.md", "hooks/y.mjs", ...]   pack items this configuration does not install (optional)
//   "sourceFiles": "<regex>"   what doctor's coverage counts as source (optional; default C, C++ and shaders)
//   "preamble":  { "always": [...], "never": [...] }  the house rules of its CLAUDE.md block
// The order of its hooks is the packs': each hook row's `order` (lib/settings.mts). Its rules, hooks, checks and skills are its
// packs' (`configs` lists them). layout.json "configuration" names the one a project has; `update` applies it; an install from
// before 0.10.0 gets the smallest configuration that takes its packs.
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLayout } from '../packs/base/hooks/lib/layout.mts';
import { readJson } from '../packs/base/hooks/lib/json.mts';
import type { Configuration, Layout, Logger } from '../packs/base/hooks/lib/types.d.mts';
import { mergeConfig, type ConfigDelta, type SharedConfig } from './config-merge.mts';
import { fitsOf, type PackFields } from './pack-manifest.mts';
import { PACKS_DIR, customPacks, planFiles, readPack } from './packs.mts';

export const CONFIGS_DIR: string = join(dirname(fileURLToPath(import.meta.url)), '..', 'configurations');
/** What every configuration holds; the folders beside it each hold one configuration's deltas. */
export const SHARED_FILE: string = join(CONFIGS_DIR, 'shared.json');

/** What a configuration reads of a project's layout. */
export type ConfigLayout = Partial<Layout>;

/** A plan's files told apart by what they are: the items of each kind, sorted. */
export type Items = Record<'rules' | 'hooks' | 'checks' | 'skills', string[]>;
const KINDS = ['rules', 'hooks', 'checks', 'skills'] as const;

export function availableConfigs(): string[] {
  return readdirSync(CONFIGS_DIR).filter((d) => existsSync(join(CONFIGS_DIR, d, 'config.json'))).sort();
}

/** Every configuration of a kit folder (the kit itself, or a copy a test plants a fault in), each as it reads there: its deltas over that
 *  folder's shared.json, and the packs that fit it by that folder's pack.json files. */
export function configsAt(kit: string): Configuration[] {
  const shared = readJson<SharedConfig>(join(kit, 'configurations', 'shared.json'));
  if (shared === null) return [];
  const folders = (dir: string): string[] => (existsSync(dir) ? readdirSync(dir).filter((d) => existsSync(join(dir, d, 'pack.json')) || existsSync(join(dir, d, 'config.json'))).sort() : []);
  const fits = Object.fromEntries(folders(join(kit, 'packs')).map((p) => [p, fitsOf(readJson<PackFields>(join(kit, 'packs', p, 'pack.json')) ?? {})]));
  return folders(join(kit, 'configurations')).flatMap((name) => {
    const delta = readJson<ConfigDelta>(join(kit, 'configurations', name, 'config.json'));
    return delta === null ? [] : [mergeConfig(name, shared, delta, fits)];
  });
}

/** What each stock pack says of the configurations it may join: pack name, then its `fits`. */
export function packFits(): Record<string, string[]> {
  return Object.fromEntries(readdirSync(PACKS_DIR).filter((d) => existsSync(join(PACKS_DIR, d, 'pack.json'))).sort().map((d) => [d, fitsOf(readPack(d))]));
}

/** A configuration by name: the shared base and its deltas, with the packs that fit it. Throws on an unknown one, or a file that is not JSON. */
export function readConfig(name: string): Configuration {
  const file = join(CONFIGS_DIR, String(name), 'config.json');
  if (!existsSync(file)) throw new Error(`unknown configuration "${name}" (available: ${availableConfigs().join(', ')})`);
  const delta = readJson<ConfigDelta>(file);
  if (delta === null) throw new Error(`configuration ${name}: ${file} is not valid JSON`);
  const shared = readJson<SharedConfig>(SHARED_FILE);
  if (shared === null) throw new Error(`${SHARED_FILE} is missing or not valid JSON`);
  return mergeConfig(String(name), shared, delta, packFits());
}

/** Every pack a configuration takes, always-installed first. */
export const allowedPacks = (config: Configuration): string[] => [...config.packs.always, ...config.packs.choose, ...customPacks()]; // a team's own pack goes with any configuration

/** The packs a project names, checked against its configuration: base first, then the configuration's own, then the chosen. */
export function packsFor(config: Configuration, requested: readonly string[]): string[] {
  const allowed = allowedPacks(config);
  const bad = requested.filter((p) => !allowed.includes(p));
  if (bad.length) throw new Error(`${bad.join(', ')} ${bad.length > 1 ? 'are' : 'is'} not in configuration ${config.name} (it takes: ${allowed.join(', ')})`);
  const out = [...config.packs.always];
  for (const p of requested) if (!out.includes(p)) out.push(p);
  return out;
}

/** The packs written in the lock and named in CLAUDE.md: base and the chosen ones; a configuration's own packs come with it. */
export const listedPacks = (config: Configuration, sources: readonly string[]): string[] => sources.filter((p) => p === 'base' || !config.packs.always.includes(p));

/** The configuration of an install that names none: the smallest one that takes all its packs. */
export function inferConfig(packs: readonly string[]): Configuration {
  const fits = availableConfigs().map(readConfig).filter((c) => packs.every((p) => allowedPacks(c).includes(p)));
  // The configuration that has a pack by default first, then one with no folder layout of its own, then the smallest.
  const rank = (c: Configuration): number[] => [packs.some((p) => c.packs.default.includes(p)) ? 0 : 1, c.packs.always.length, allowedPacks(c).length];
  const best = fits.sort((a, b) => rank(a).map((v, i) => v - (rank(b)[i] ?? 0)).find(Boolean) ?? 0)[0];
  if (best === undefined) throw new Error(`no configuration takes the packs ${packs.join(', ')}; name one with --config`);
  return best;
}

export interface ResolveOptions { named?: string | null; layout?: ConfigLayout; packs?: readonly string[] }
export type ConfigHow = 'named' | 'layout' | 'packs';

/** Which configuration an install uses: the one named now (--config), else layout.json's, else its packs'. */
export function resolveConfig({ named = null, layout = {}, packs = [] }: ResolveOptions = {}): { config: Configuration; how: ConfigHow } {
  if (named) return { config: readConfig(named), how: 'named' };
  if (layout.configuration) return { config: readConfig(layout.configuration), how: 'layout' };
  return { config: inferConfig(packs), how: 'packs' };
}

/** What a configuration installs with these packs: every file, by its place in the project. */
export function planOf(config: Configuration, sources: readonly string[], layout: ConfigLayout = { folders: {}, disable: [] }): Set<string> {
  const optIn = sources.flatMap((s) => readPack(s).optIn ?? []).filter((i) => !(layout.enable ?? []).includes(i)); // opt-in: only when enabled
  const leaveOut = Array.isArray(config.leaveOut) ? config.leaveOut.filter((i): i is string => typeof i === 'string') : [];
  const lay = { ...layout, disable: [...(layout.disable ?? []), ...leaveOut, ...optIn] };
  const files = new Set<string>();
  for (const name of sources) for (const { rel } of planFiles(name, lay)) files.add(rel);
  return files;
}

/** The files of a plan, told apart by kind. */
export function itemsOf(files: Iterable<string>): Items {
  const by: Items = { rules: [], hooks: [], checks: [], skills: [] };
  for (const rel of files) {
    const p = rel.replace(/\\/g, '/');
    const skill = p.match(/(?:^|\/)\.claude\/skills\/([^/]+)\/SKILL\.md$/)?.[1];
    if (skill !== undefined) by.skills.push(skill);
    else if (/^\.claude\/rules\/[^/]+\.md$/.test(p)) by.rules.push(basename(p));
    else if (/^\.claude\/hooks\/[^/]+\.(mjs|py)$/.test(p)) by.hooks.push(basename(p));
    else if (/^\.claude\/checks\/[^/]+\.json$/.test(p)) by.checks.push(basename(p));
  }
  for (const k of KINDS) by[k].sort();
  return by;
}

export function describeConfigs(current: string | null = null): string {
  return availableConfigs().map((name) => {
    const c = readConfig(name);
    const all = [...c.packs.always, ...c.packs.choose];
    const n = itemsOf(planOf(c, all));
    const choose = c.packs.choose.length ? `; ${c.packs.choose.join(', ')} (to choose)` : '';
    return [
      `${name}${name === current ? '  (this project)' : ''}`,
      `  ${c.description}`,
      `  packs: ${c.packs.always.join(', ')} (always)${choose}${c.packs.default.length ? `; init takes ${c.packs.default.join(', ')}` : ''}`,
      `  with every pack: rules ${n.rules.length}, hooks ${n.hooks.length}, checks ${n.checks.length}, skills ${n.skills.length}`,
      `  folders: ${Object.values(c.layout?.folders ?? {}).map((f) => `${f.path}/`).join(' ') || '(its packs\')'}`,
    ].join('\n');
  }).join('\n\n');
}

/** The lines `config <name>` prints: what the switch adds and takes away.
 *  `installed`: the files the project's lock names (what it has now); without it, what `from` would install. */
export function describeSwitch(from: Configuration, fromSources: readonly string[], to: Configuration, toSources: readonly string[], layout: ConfigLayout, installed: readonly string[] | null = null): string[] {
  const before = itemsOf(installed ? new Set(installed) : planOf(from, fromSources, layout));
  const after = itemsOf(planOf(to, toSources, layout));
  const lines = [`  ${from.name} -> ${to.name}`];
  const fromListed = listedPacks(from, fromSources), toListed = listedPacks(to, toSources);
  const added = toListed.filter((p) => !fromListed.includes(p)), dropped = fromListed.filter((p) => !toListed.includes(p));
  if (added.length) lines.push(`  packs added: ${added.join(', ')}`);
  if (dropped.length) lines.push(`  packs dropped: ${dropped.join(', ')}`);
  for (const kind of KINDS) {
    const plus = after[kind].filter((x) => !before[kind].includes(x)), minus = before[kind].filter((x) => !after[kind].includes(x));
    if (plus.length) lines.push(`  ${kind} added (${plus.length}): ${plus.join(', ')}`);
    if (minus.length) lines.push(`  ${kind} removed (${minus.length}): ${minus.join(', ')}`);
  }
  if (JSON.stringify(from.preamble) !== JSON.stringify(to.preamble)) lines.push('  CLAUDE.md preamble: changes');
  const missing = Object.values(to.layout?.folders ?? {}).filter((f) => !Object.values(layout.folders ?? {}).some((g) => g.path === f.path));
  if (missing.length && !layout.complete) lines.push(`  folders added from its template: ${missing.map((f) => `${f.path}/`).join(' ')}`);
  return lines.length > 1 ? lines : [...lines, '  no change'];
}

/** doctor's lines: the configuration installed, and what does not fit it. */
export function configProblems(dir: string, lockPacks: readonly string[], log: Logger): string[] {
  if (!existsSync(join(dir, '.claude', 'layout.json'))) return [];
  const layout = readLayout(dir);
  let config: Configuration;
  try {
    config = resolveConfig({ layout, packs: lockPacks }).config;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return [layout.configuration ? `layout.json names configuration "${layout.configuration}", which this kit does not have (${message})` : message];
  }
  log(`  configuration: ${config.name}${layout.configuration ? '' : ' (from its packs; `update` writes it into layout.json)'}`);
  return lockPacks.filter((p) => !allowedPacks(config).includes(p)).map((p) => `pack ${p} is installed but configuration ${config.name} does not take it (\`config <name>\` switches; \`configs\` lists them)`);
}

/** The configuration's "sourceFiles" as a RegExp, or undefined (coverage's default) when it names none or cannot be read. */
export function sourceFilesOf(dir: string, lockPacks: readonly string[]): RegExp | undefined {
  try {
    const layout = readLayout(dir);
    const re = layout.sourceFiles ?? resolveConfig({ layout, packs: lockPacks }).config.sourceFiles;
    return re ? new RegExp(re, 'i') : undefined;
  } catch {
    return undefined;
  }
}
