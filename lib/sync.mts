// Installs or updates the chosen packs in one project. Never touches ~/.claude, and never
// overwrites anything the user owns or edited:
//   - an existing file the packs didn't create is left alone; the pack's version goes beside it as <file>.pack-new
//   - a pack file the user edited is kept; the new version goes beside it as <file>.pack-new
//   - CLAUDE.md: only the marked claude-packs section is written; settings.json: only our hooks
//   - CLAUDE.md, settings.json and layout.json are backed up before every run
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { parseJson, readJson } from '../packs/base/hooks/lib/json.mts';
import type { Configuration, Layout, Lock, Logger } from '../packs/base/hooks/lib/types.d.mts';
import { backup, ensureGitignore } from './backup.mts';
import type { Preamble } from './claude-md.mts';
import { writeClaudeMd } from './claude-md.mts';
import { listedPacks, packsFor, resolveConfig } from './configs.mts';
import { withFoundFolders } from './found-folders.mts';
import { buildLayout } from './layout.mts';
import { hashFile, isModified, readLock, writeLock } from './manifest.mts';
import { normalisePacks, planFiles } from './packs.mts';
import { applyPaths, renderRule } from './rules.mts';
import { readSettings, syncSettings } from './settings.mts';
import { reportSwitches, switches } from './switches.mts';

const NEW_SUFFIX = '.pack-new';
// the lock says which kit wrote it (AdmiralMCP B-13)
const KIT_VERSION: string = readJson<{ version: string }>(fileURLToPath(new URL('../package.json', import.meta.url)))?.version ?? '';

function placeBeside(src: string, dest: string, why: string, log: Logger): void {
  copyFileSync(src, dest + NEW_SUFFIX);
  log(`  ${why}: kept yours, new version saved as ${dest.split('/').slice(-3).join('/')}${NEW_SUFFIX}`);
}

// True when the file in the project is the pack's own version of it, byte for byte: the pack file
// itself, or, for a rule, the pack rule with this layout's paths written in. Such a file is the
// package's whatever the lock says (the user took a .pack-new, or an older install's copy already
// matches), so it is taken over and tracked; a .pack-new beside it would be a copy of itself.
function isPackVersion(src: string, dest: string, rel: string, layout: Layout): boolean {
  if (!existsSync(dest)) return false;
  if (hashFile(src) === hashFile(dest)) return true;
  if (!/(^|[\\/])rules[\\/][^\\/]+\.md$/.test(rel)) return false;
  const rendered = renderRule(readText(src) ?? '', layout);
  return rendered !== null && rendered === readText(dest);
}

interface Copied { files: Record<string, string>; untouchable: Set<string> }

function copyPackFiles(projectDir: string, packNames: readonly string[], layout: Layout, lock: Lock, force: boolean, log: Logger): Copied {
  const files: Record<string, string> = {};
  const untouchable = new Set<string>();
  for (const name of packNames) {
    for (const { src, rel, userOwned } of planFiles(name, layout)) {
      const dest = join(projectDir, rel);
      const tracked = lock.files[rel] !== undefined;
      const same = !userOwned && isPackVersion(src, dest, rel, layout);
      if (existsSync(dest) && !tracked && !same) {
        // Not ours: The user's own file with the same name. Never overwrite it.
        if (!userOwned) placeBeside(src, dest, `${rel} already exists`, log);
        untouchable.add(rel);
        continue;
      }
      if (!force && !same && isModified(projectDir, rel, lock)) {
        placeBeside(src, dest, `you edited ${rel}`, log);
        const kept = lock.files[rel];
        if (kept !== undefined) files[rel] = kept;
        untouchable.add(rel);
        continue;
      }
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      rmSync(dest + NEW_SUFFIX, { force: true });
      files[rel] = hashFile(dest);
    }
  }
  return { files, untouchable };
}

function removeDropped(projectDir: string, lock: Lock, files: Readonly<Record<string, string>>, log: Logger): void {
  for (const rel of Object.keys(lock.files)) {
    if (files[rel] !== undefined) continue;
    if (isModified(projectDir, rel, lock)) {
      log(`  left ${rel}: no longer in any pack, but you edited it`);
      continue;
    }
    rmSync(join(projectDir, rel), { force: true });
    log(`  removed ${rel}`);
  }
}

/** The folders a layout names, made (a planned one is not made yet). */
export function createFolders(projectDir: string, layout: { folders: Record<string, { path: string; planned?: boolean }> }): void {
  for (const f of Object.values(layout.folders)) if (!f.planned) mkdirSync(join(projectDir, f.path), { recursive: true });
}

// The layout.json a project has now, or null (read before anything is written, to know its configuration). One that is not JSON stops the install.
function currentLayout(claudeDir: string): Layout | null {
  const file = join(claudeDir, 'layout.json');
  if (!existsSync(file)) return null;
  const layout = parseJson<Layout>(readText(file));
  if (layout === null) throw new Error(`${file} is not valid JSON; fix it first, nothing was changed`);
  return layout;
}

// A configuration's preamble is a house-rules object; one without it adds no rules.
function preambleOf(config: Configuration): Preamble {
  const p: unknown = config.preamble;
  const lines = (key: string): readonly string[] => {
    const list = typeof p === 'object' && p !== null && key in p ? (p as Record<string, unknown>)[key] : [];
    return Array.isArray(list) ? list.filter((l): l is string => typeof l === 'string') : [];
  };
  return { always: lines('always'), never: lines('never') };
}

export interface SyncOptions {
  /** Replace files the user edited. */
  force?: boolean;
  /** Make the layout's folders. */
  mkdirs?: boolean;
  /** The layout a first install starts from. */
  seedLayout?: Partial<Layout> | null;
  /** A configuration named now (init --config, `config <name>`); otherwise layout.json's, else the one of its packs. */
  config?: string | null;
  /** Where each custom pack was fetched from. */
  sources?: Lock['sources'] | null;
  log?: Logger;
}
export interface SyncOutcome { packNames: string[]; layout: Layout; config: Configuration }

/** Installs or updates the packs in one project, in this order: resolve the configuration, back up, write the layout,
 *  decide what switches on, copy the pack files, drop the ones no pack has, merge the hooks into settings, rewrite the
 *  rules' paths, write the CLAUDE.md block, write the lock. */
export async function sync(projectDir: string, requested: readonly string[] | null, { force = false, mkdirs = false, seedLayout = null, config: named = null, sources = null, log = console.log }: SyncOptions = {}): Promise<SyncOutcome> {
  const claudeDir = join(projectDir, '.claude');
  const lock = readLock(claudeDir);
  const before = currentLayout(claudeDir);
  const asked = normalisePacks(requested ?? lock.packs);
  const { config, how } = resolveConfig({ named, layout: before ?? seedLayout ?? {}, packs: asked });
  const packNames = packsFor(config, asked); // base, the configuration's own packs, the chosen ones; refuses a pack it does not take
  const listed = listedPacks(config, packNames);
  const hadClaude = existsSync(claudeDir);
  mkdirSync(claudeDir, { recursive: true });
  readSettings(claudeDir); // throws on a malformed settings.json before anything is written
  log(`  configuration: ${config.name}${how === 'packs' ? ` (from its packs: ${listed.join(', ')})` : ''}`);
  if (hadClaude) log(`  backup: ${backup(projectDir)}`);
  ensureGitignore(projectDir);

  const seed = existsSync(join(claudeDir, 'layout.json')) ? seedLayout : withFoundFolders(projectDir, seedLayout, config, log);
  const layout = buildLayout(claudeDir, packNames, seed, config);
  if (mkdirs) createFolders(projectDir, layout);
  // New hooks and checks switch on only where the project chose them; the lists are printed first. A configuration's own
  // packs count as had while the project keeps its configuration (before 0.10.0 their files were base's).
  const kept = lock.packs.length > 0 && (!before?.configuration || before.configuration === config.name);
  const sw = switches(projectDir, packNames, layout, { ...lock, packs: kept ? [...lock.packs, ...config.packs.always] : lock.packs });
  reportSwitches(sw, log);
  const installed: Layout = { ...layout, disable: [...(layout.disable ?? []), ...sw.held, ...(Array.isArray(config['leaveOut']) ? (config['leaveOut'] as string[]) : [])] };
  const { files, untouchable } = copyPackFiles(projectDir, packNames, installed, lock, force, log);
  removeDropped(projectDir, lock, files, log);
  const { retired, statusLine } = syncSettings(claudeDir, packNames, installed, Object.keys(lock.files), config.hookOrder);
  if (retired.length) log(`  retired settings entries (merged into protect-vendor, or global by design): ${retired.join(', ')}`);
  if (statusLine === 'kept') log('  status line: the project has its own, kept; the kit\'s is .claude/tools/statusline.mjs, to wire by hand');
  const { stale } = await applyPaths(projectDir, { skip: untouchable });
  writeClaudeMd(projectDir, layout, listed, preambleOf(config));

  // Rules were rewritten from the layout, so record their final hashes (never for files we left alone).
  for (const rel of Object.keys(files)) {
    if (untouchable.has(rel) || !rel.includes('/rules/') || !existsSync(join(projectDir, rel))) continue;
    files[rel] = hashFile(join(projectDir, rel));
  }
  const fetched = Object.fromEntries(Object.entries({ ...lock.sources, ...sources }).filter(([name]) => listed.includes(name)));
  // packs: what was asked for, which an update reads back; installed: every pack whose files are here, the configuration's own too (KF-4)
  writeLock(claudeDir, { kit: KIT_VERSION, packs: listed, installed: [...new Set([...listed, ...config.packs.always])], ...(Object.keys(fetched).length ? { sources: fetched } : {}), updated: new Date().toISOString(), files });
  log(`Packs: ${listed.join(', ')}. ${Object.keys(files).length} files managed, ${stale} rule paths refreshed.`);
  return { packNames: listed, layout, config };
}
