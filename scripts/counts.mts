// The per-version manifest of what an update installs (typescript order W5.4, d-8): the files and hashes the kit's `update` makes of
// each old project kept in test/fixtures/noop, written to packs/manifest-<version>.json. It replaces the hand lists the noop test kept
// (what changed on purpose, what was added): a change to an installed file shows as a line of this file's diff, to be read and kept.
//   node scripts/counts.mts            writes the manifest
//   node scripts/counts.mts --check    exits 1 when the manifest is not what the kit installs now
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, readText } from '../packs/base/hooks/lib/files.mts';
import { gitRun } from '../packs/base/hooks/lib/git-run.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import { parseJson, readJson, toJson, writeJson } from '../packs/base/hooks/lib/json.mts';

/** The old projects the manifest is made from, and the configuration each one's update is made in. */
export const PROJECTS = { stellix: 'synth-creator', sub37: 'synth-creator', 'full-stack': 'full-stack' } as const;
export type ProjectName = keyof typeof PROJECTS;

/** What one project's `update` leaves in its lock: every installed file with its hash, and the packs. */
export interface ProjectInstall { packs: string[]; files: Record<string, string> }
export interface Manifest { version: string; projects: Record<ProjectName, ProjectInstall> }

export const MANIFEST_VERSION = '2.0.0';
export const manifestFile = (kit: string): string => join(kit, 'packs', `manifest-${MANIFEST_VERSION}.json`);

/** The old project's install state (test/fixtures/noop/<project>/before) in a fresh folder, updated by the kit's own command. The
 *  folder, and what the update printed. `configuration` null leaves the layout naming none. */
export function updatedProject(kit: string, project: ProjectName, configuration: string | null = PROJECTS[project]): { dir: string; out: string } {
  const dir = mkdtempSync(join(tmpdir(), `manifest-${project}-`));
  const before = (name: string): string => join(kit, 'test/fixtures/noop', project, 'before', name);
  mkdirSync(join(dir, '.claude'));
  put(join(dir, 'package.json'), '{}\n');   // these projects hold the kit as a dev dependency: a project with none is told another command (KWB-76)
  const layout = readJson<Record<string, unknown>>(before('layout.json'), {}) ?? {};
  if (configuration !== null) layout.configuration = configuration;
  writeJson(join(dir, '.claude/layout.json'), layout, { pretty: true });
  copyFileSync(before('settings.json'), join(dir, '.claude/settings.json'));
  copyFileSync(before('lock.json'), join(dir, '.claude/claude-packs.lock.json'));
  copyFileSync(before('claude-md.txt'), join(dir, 'CLAUDE.md'));
  gitRun(['init', '-q'], { cwd: dir, env: process.env });
  // doctor's verdict is the copy's (no design/shape.json, Stellix's own hooks' tools): not judged here
  const r = spawnSync('node', [join(kit, 'bin/claude-packs.mjs'), 'update', '--dir', dir], { encoding: 'utf8', env: { ...process.env, CLAUDE_PACKS_SELFTESTS: 'gate' } });
  return { dir, out: r.stdout };
}

/** The lock an update left in a project folder. */
export function installOf(dir: string): ProjectInstall {
  const lock = readJson<{ packs?: string[]; files?: Record<string, string> }>(join(dir, '.claude/claude-packs.lock.json'), {}) ?? {};
  return { packs: lock.packs ?? [], files: Object.fromEntries(Object.entries(lock.files ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))) };
}

/** The manifest of this kit: each old project updated and its lock read. */
export function manifestOf(kit: string): Manifest {
  const projects = {} as Record<ProjectName, ProjectInstall>;
  for (const name of Object.keys(PROJECTS) as ProjectName[]) {
    const { dir } = updatedProject(kit, name);
    projects[name] = installOf(dir);
    rmSync(dir, { recursive: true, force: true });
  }
  return { version: MANIFEST_VERSION, projects };
}

/** The manifest the kit holds, or null where it holds none. */
export const readManifest = (kit: string): Manifest | null => parseJson<Manifest>(readText(manifestFile(kit)));

if (isMain(import.meta.url)) {
  const kit = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const made = manifestOf(kit);
  if (process.argv.includes('--check')) {
    const same = toJson(readManifest(kit)) === toJson(made);
    if (!same) console.error(`${manifestFile(kit)} is not what the kit installs: run node scripts/counts.mts`);
    process.exit(same ? 0 : 1);
  }
  writeJson(manifestFile(kit), made, { pretty: true });
  console.log(`wrote ${manifestFile(kit)}`);
}
