// The kit version a project runs (KWB-162): its installed package's own package.json, never the lock's note of the last install
// (a packed build installed with --no-save leaves the lock behind); the lock only where no package is installed. One reader for
// the status line and kit-fresh.
//   KIT                    the package's name
//   packageVersion(dir)    node_modules/@thedecipherist/claude-packs/package.json's version under dir, or null
//   lockVersion(dir)       .claude/claude-packs.lock.json's "kit" under dir, or null
//   runningKit(dir)        the first of the two
import { join } from 'node:path';
import { readJson } from './json.mts';
import type { Lock } from './types.d.mts';

export const KIT = '@thedecipherist/claude-packs';

/** The fields of a package.json this module reads; the file is outside data, so each is narrowed. */
interface PackageFields { name?: unknown; version?: unknown }

const versionOf = (file: string): string | null => {
  const p = readJson<PackageFields>(file);
  return p?.name === KIT && typeof p.version === 'string' ? p.version : null;
};
export const packageVersion = (dir: string | null | undefined): string | null => (dir ? versionOf(join(dir, 'node_modules', '@thedecipherist', 'claude-packs', 'package.json')) : null);
export const checkoutVersion = (dir: string | null | undefined): string | null => (dir ? versionOf(join(dir, 'package.json')) : null);
export const lockVersion = (dir: string | null | undefined): string | null => {
  const v: unknown = dir ? readJson<Partial<Lock>>(join(dir, '.claude', 'claude-packs.lock.json'))?.kit : null;
  return typeof v === 'string' ? v : null;
};
export const runningKit = (dir: string | null | undefined): string | null => packageVersion(dir) ?? lockVersion(dir);
