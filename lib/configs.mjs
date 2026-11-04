// Configurations (0.10.0, STEP 3; KWB-31): a kind of project, as data. configurations/<name>/config.json holds
//   "packs":     { "always": [...], "choose": [...], "default": [...] }  the packs it always installs (base first), the ones
//                a project may add, and the ones `init --config <name>` takes when none are named
//   "layout":    { "folders", "concepts", "kinds" }   the layout template: the folder structure of that kind of project
//   "hookOrder": { "<event> <matcher>": ["a.mjs", ...] }   the order its hooks run in, per settings entry (optional)
//   "leaveOut":  ["rules/x.md", "hooks/y.mjs", ...]   pack items this configuration does not install (optional)
//   "sourceFiles": "<regex>"   what doctor's coverage counts as source (optional; default C, C++ and shaders)
//   "preamble":  { "always": [...], "never": [...] }  the house rules of its CLAUDE.md block
// Its rules, hooks, checks and skills are its packs' (`configs` lists them). layout.json "configuration" names the one a
// project has; `update` applies it; an install from before 0.10.0 gets the smallest configuration that takes its packs.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { customPacks, planFiles, readPack } from './packs.mjs';

export const CONFIGS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'configurations');

export function availableConfigs() {
  return readdirSync(CONFIGS_DIR).filter((d) => existsSync(join(CONFIGS_DIR, d, 'config.json'))).sort();
}

export function readConfig(name) {
  const file = join(CONFIGS_DIR, String(name), 'config.json');
  if (!existsSync(file)) throw new Error(`unknown configuration "${name}" (available: ${availableConfigs().join(', ')})`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

// Every pack a configuration takes, always-installed first.
export const allowedPacks = (config) => [...config.packs.always, ...config.packs.choose, ...customPacks()]; // a team's own pack goes with any configuration

// The packs a project names, checked against its configuration: base first, then the configuration's own, then the chosen.
export function packsFor(config, requested) {
  const allowed = allowedPacks(config);
  const bad = requested.filter((p) => !allowed.includes(p));
  if (bad.length) throw new Error(`${bad.join(', ')} ${bad.length > 1 ? 'are' : 'is'} not in configuration ${config.name} (it takes: ${allowed.join(', ')})`);
  const out = [...config.packs.always];
  for (const p of requested) if (!out.includes(p)) out.push(p);
  return out;
}

// The packs written in the lock and named in CLAUDE.md: base and the chosen ones; a configuration's own packs come with it.
export const listedPacks = (config, sources) => sources.filter((p) => p === 'base' || !config.packs.always.includes(p));

// The configuration of an install that names none: the smallest one that takes all its packs.
export function inferConfig(packs) {
  const fits = availableConfigs().map(readConfig).filter((c) => packs.every((p) => allowedPacks(c).includes(p)));
  if (!fits.length) throw new Error(`no configuration takes the packs ${packs.join(', ')}; name one with --config`);
  // The configuration that has a pack by default first, then one with no folder layout of its own, then the smallest.
  const rank = (c) => [packs.some((p) => c.packs.default.includes(p)) ? 0 : 1, c.packs.always.length, allowedPacks(c).length];
  return fits.sort((a, b) => rank(a).map((v, i) => v - rank(b)[i]).find(Boolean) ?? 0)[0];
}

// Which configuration an install uses: the one named now (--config), else layout.json's, else its packs'.
export function resolveConfig({ named = null, layout = {}, packs = [] } = {}) {
  if (named) return { config: readConfig(named), how: 'named' };
  if (layout.configuration) return { config: readConfig(layout.configuration), how: 'layout' };
  return { config: inferConfig(packs), how: 'packs' };
}

// What a configuration installs with these packs: every file, by its place in the project, and the items by kind.
export function planOf(config, sources, layout = { folders: {}, disable: [] }) {
  const optIn = sources.flatMap((s) => readPack(s).optIn ?? []).filter((i) => !(layout.enable ?? []).includes(i)); // opt-in: only when enabled
  const lay = { ...layout, disable: [...(layout.disable ?? []), ...(config.leaveOut ?? []), ...optIn] };
  const files = new Set();
  for (const name of sources) for (const { rel } of planFiles(name, lay)) files.add(rel);
  return files;
}

export function itemsOf(files) {
  const by = { rules: [], hooks: [], checks: [], skills: [] };
  for (const rel of files) {
    const p = rel.replace(/\\/g, '/');
    const skill = p.match(/(?:^|\/)\.claude\/skills\/([^/]+)\/SKILL\.md$/);
    if (skill) by.skills.push(skill[1]);
    else if (/^\.claude\/rules\/[^/]+\.md$/.test(p)) by.rules.push(p.split('/').pop());
    else if (/^\.claude\/hooks\/[^/]+\.(mjs|py)$/.test(p)) by.hooks.push(p.split('/').pop());
    else if (/^\.claude\/checks\/[^/]+\.json$/.test(p)) by.checks.push(p.split('/').pop());
  }
  for (const k of Object.keys(by)) by[k].sort();
  return by;
}

export function describeConfigs(current = null) {
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

// The lines `config <name>` prints: what the switch adds and takes away.
// `installed`: the files the project's lock names (what it has now); without it, what `from` would install.
export function describeSwitch(from, fromSources, to, toSources, layout, installed = null) {
  const before = itemsOf(installed ? new Set(installed) : planOf(from, fromSources, layout));
  const after = itemsOf(planOf(to, toSources, layout));
  const lines = [`  ${from.name} -> ${to.name}`];
  const fromListed = listedPacks(from, fromSources), toListed = listedPacks(to, toSources);
  const added = toListed.filter((p) => !fromListed.includes(p)), dropped = fromListed.filter((p) => !toListed.includes(p));
  if (added.length) lines.push(`  packs added: ${added.join(', ')}`);
  if (dropped.length) lines.push(`  packs dropped: ${dropped.join(', ')}`);
  for (const kind of Object.keys(before)) {
    const plus = after[kind].filter((x) => !before[kind].includes(x)), minus = before[kind].filter((x) => !after[kind].includes(x));
    if (plus.length) lines.push(`  ${kind} added (${plus.length}): ${plus.join(', ')}`);
    if (minus.length) lines.push(`  ${kind} removed (${minus.length}): ${minus.join(', ')}`);
  }
  if (JSON.stringify(from.preamble) !== JSON.stringify(to.preamble)) lines.push('  CLAUDE.md preamble: changes');
  const missing = Object.values(to.layout?.folders ?? {}).filter((f) => !Object.values(layout.folders ?? {}).some((g) => g.path === f.path));
  if (missing.length && !layout.complete) lines.push(`  folders added from its template: ${missing.map((f) => `${f.path}/`).join(' ')}`);
  return lines.length > 1 ? lines : [...lines, '  no change'];
}

// doctor's lines: the configuration installed, and what does not fit it.
export function configProblems(dir, lockPacks, log) {
  const file = join(dir, '.claude', 'layout.json');
  if (!existsSync(file)) return [];
  const layout = JSON.parse(readFileSync(file, 'utf8'));
  let config;
  try {
    config = resolveConfig({ layout, packs: lockPacks }).config;
  } catch (e) {
    return [layout.configuration ? `layout.json names configuration "${layout.configuration}", which this kit does not have (${e.message})` : e.message];
  }
  log(`  configuration: ${config.name}${layout.configuration ? '' : ' (from its packs; `update` writes it into layout.json)'}`);
  return lockPacks.filter((p) => !allowedPacks(config).includes(p)).map((p) => `pack ${p} is installed but configuration ${config.name} does not take it (\`config <name>\` switches; \`configs\` lists them)`);
}

// The configuration's "sourceFiles" as a RegExp, or undefined (coverage's default) when it names none or cannot be read.
export function sourceFilesOf(dir, lockPacks) {
  try {
    const file = join(dir, '.claude', 'layout.json');
    const layout = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    const re = layout.sourceFiles ?? resolveConfig({ layout, packs: lockPacks }).config.sourceFiles;
    return re ? new RegExp(re, 'i') : undefined;
  } catch {
    return undefined;
  }
}
