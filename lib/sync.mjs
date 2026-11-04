// Installs or updates the chosen packs in one project. Never touches ~/.claude, and never
// overwrites anything the user owns or edited:
//   - an existing file the packs didn't create is left alone; the pack's version goes beside it as <file>.pack-new
//   - a pack file the user edited is kept; the new version goes beside it as <file>.pack-new
//   - CLAUDE.md: only the marked claude-packs section is written; settings.json: only our hooks
//   - CLAUDE.md, settings.json and layout.json are backed up before every run
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { backup, ensureGitignore } from './backup.mjs';
import { writeClaudeMd } from './claude-md.mjs';
import { listedPacks, packsFor, resolveConfig } from './configs.mjs';
import { buildLayout } from './layout.mjs';
import { hashFile, isModified, readLock, writeLock } from './manifest.mjs';
import { normalisePacks, planFiles } from './packs.mjs';
import { applyPaths, renderRule } from './rules.mjs';
import { readSettings, syncSettings } from './settings.mjs';
import { reportSwitches, switches } from './switches.mjs';

const NEW_SUFFIX = '.pack-new';
const KIT_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version; // the lock says which kit wrote it (AdmiralMCP B-13)

function placeBeside(src, dest, why, log) {
  copyFileSync(src, dest + NEW_SUFFIX);
  log(`  ${why}: kept yours, new version saved as ${dest.split('/').slice(-3).join('/')}${NEW_SUFFIX}`);
}

// True when the file in the project is the pack's own version of it, byte for byte: the pack file
// itself, or, for a rule, the pack rule with this layout's paths written in. Such a file is the
// package's whatever the lock says (the user took a .pack-new, or an older install's copy already
// matches), so it is taken over and tracked; a .pack-new beside it would be a copy of itself.
function isPackVersion(src, dest, rel, layout) {
  if (!existsSync(dest)) return false;
  if (hashFile(src) === hashFile(dest)) return true;
  if (!/(^|[\\/])rules[\\/][^\\/]+\.md$/.test(rel)) return false;
  const rendered = renderRule(readFileSync(src, 'utf8'), layout);
  return rendered !== null && rendered === readFileSync(dest, 'utf8');
}

function copyPackFiles(projectDir, packNames, layout, lock, force, log) {
  const files = {};
  const untouchable = new Set();
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
        files[rel] = lock.files[rel];
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

function removeDropped(projectDir, lock, files, log) {
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

export function createFolders(projectDir, layout) {
  for (const f of Object.values(layout.folders)) if (!f.planned) mkdirSync(join(projectDir, f.path), { recursive: true });
}

// The layout.json a project has now, or null (read before anything is written, to know its configuration).
function currentLayout(claudeDir) {
  const file = join(claudeDir, 'layout.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

// `config`: a configuration named now (init --config, `config <name>`); otherwise layout.json's, else the one of its packs.
export async function sync(projectDir, requested, { force = false, mkdirs = false, seedLayout = null, config: named = null, sources = null, log = console.log } = {}) {
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

  const layout = buildLayout(claudeDir, packNames, seedLayout, config);
  if (mkdirs) createFolders(projectDir, layout);
  // New hooks and checks switch on only where the project chose them; the lists are printed first. A configuration's own
  // packs count as had while the project keeps its configuration (before 0.10.0 their files were base's).
  const kept = lock.packs.length > 0 && (!before?.configuration || before.configuration === config.name);
  const sw = switches(projectDir, packNames, layout, { ...lock, packs: kept ? [...lock.packs, ...config.packs.always] : lock.packs });
  reportSwitches(sw, log);
  const installed = { ...layout, disable: [...(layout.disable ?? []), ...sw.held, ...(config.leaveOut ?? [])] };
  const { files, untouchable } = copyPackFiles(projectDir, packNames, installed, lock, force, log);
  removeDropped(projectDir, lock, files, log);
  const { retired } = syncSettings(claudeDir, packNames, installed, Object.keys(lock.files), config.hookOrder);
  if (retired.length) log(`  retired settings entries (merged into protect-vendor, or global by design): ${retired.join(', ')}`);
  const { stale } = await applyPaths(projectDir, { skip: untouchable });
  writeClaudeMd(projectDir, layout, listed, config.preamble);

  // Rules were rewritten from the layout, so record their final hashes (never for files we left alone).
  for (const rel of Object.keys(files)) {
    if (untouchable.has(rel) || !rel.includes('/rules/') || !existsSync(join(projectDir, rel))) continue;
    files[rel] = hashFile(join(projectDir, rel));
  }
  const fetched = Object.fromEntries(Object.entries({ ...lock.sources, ...sources }).filter(([name]) => listed.includes(name)));
  writeLock(claudeDir, { kit: KIT_VERSION, packs: listed, ...(Object.keys(fetched).length ? { sources: fetched } : {}), updated: new Date().toISOString(), files });
  log(`Packs: ${listed.join(', ')}. ${Object.keys(files).length} files managed, ${stale} rule paths refreshed.`);
  return { packNames: listed, layout, config };
}
