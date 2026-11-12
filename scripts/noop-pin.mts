// The oracle of the noop test (W10 review finding 6): packs/manifest-<version>.json is written by scripts/counts.mts from the same
// install code the test judges, so on its own it checks nothing. test/fixtures/noop/pinned-manifest.json is the copy a person has
// read: the test compares what an `update` installs with it, and it changes only when this script is run on purpose.
//   node scripts/noop-pin.mts            prints every file that differs between the pin and the manifest, then pins the manifest
//   node scripts/noop-pin.mts --check    prints the same and exits 1 when they differ (writes nothing)
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readText } from '../packs/base/hooks/lib/files.mts';
import { isMain } from '../packs/base/hooks/lib/hook-log.mts';
import { parseJson, toJson, writeJson } from '../packs/base/hooks/lib/json.mts';
import { PROJECTS, readManifest, type Manifest, type ProjectInstall } from './counts.mts';

export const pinFile = (kit: string): string => join(kit, 'test/fixtures/noop/pinned-manifest.json');
export const readPin = (kit: string): Manifest | null => parseJson<Manifest>(readText(pinFile(kit)));

/** What an install differs from a pinned one in: files added, files gone, files changed (path), and a different set of packs. */
export function drift(want: ProjectInstall, got: ProjectInstall): string[] {
  return [
    ...Object.keys(got.files).filter((f) => want.files[f] === undefined).map((f) => `${f}: not in the pin`),
    ...Object.keys(want.files).filter((f) => got.files[f] === undefined).map((f) => `${f}: in the pin, not installed`),
    ...Object.keys(got.files).filter((f) => want.files[f] !== undefined && want.files[f] !== got.files[f]).map((f) => `${f}: changed`),
    ...(toJson(want.packs) === toJson(got.packs) ? [] : ['the packs the lock names differ']),
  ];
}

/** The differences between the pin and a manifest, one line per file, each with its project. */
export function pinDiff(pin: Manifest | null, now: Manifest): string[] {
  return (Object.keys(PROJECTS) as (keyof typeof PROJECTS)[]).flatMap((name) => {
    const was = pin?.projects[name] ?? { packs: [], files: {} };
    return drift(was, now.projects[name]).map((line) => `${name}: ${line}`);
  });
}

if (isMain(import.meta.url)) {
  const kit = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const now = readManifest(kit);
  if (now === null) { console.error('packs/manifest is missing: run node scripts/counts.mts first'); process.exit(1); }
  const lines = pinDiff(readPin(kit), now);
  for (const line of lines) console.log(line);
  if (process.argv.includes('--check')) process.exit(lines.length === 0 ? 0 : 1);
  writeJson(pinFile(kit), now, { pretty: true });
  console.log(`pinned ${lines.length} difference(s) in ${pinFile(kit)}`);
}
