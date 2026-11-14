// can-open (synth-creator's tool): prove that the file the user will launch holds the change.
//   node .claude/tools/can-open.mjs <build folder> <launched file or bundle> [--source <folder>]... [--asset <file>]... [--marker <text>]...
// It names the file that would be launched and its build time, flags a build configuration left beside Release that sorts
// before it (Debug, MinSizeRel, RelWithDebInfo), flags a launched file older than the newest file in a --source folder (stale),
// and checks that the bytes of every --asset file, and every --marker text, are inside the launched file (a bundle: any file in it).
// Exit 0: the launched file holds the change. Exit 1: what is wrong, listed. Exit 2: the command was used wrongly.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { isMain } from '../hooks/lib/hook-log.mts';

const CONFIGS = ['Debug', 'MinSizeRel', 'RelWithDebInfo', 'Release'];
const SKIPPED = /(^|\/)(\.git|node_modules|\.DS_Store)(\/|$)/;

/** Every file under a path (the path itself when it is a file), without what tools keep beside the work. */
export function filesUnder(path: string): string[] {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { recursive: true, encoding: 'utf8' })
    .filter((rel) => !SKIPPED.test(rel))
    .map((rel) => join(path, rel))
    .filter((full) => statSync(full).isFile());
}

/** The newest modification time among the files under a path, in ms; 0 when there are none. */
export const newest = (path: string): number => Math.max(0, ...filesUnder(path).map((f) => statSync(f).mtimeMs));

/** Folders named for a build configuration that sort before Release, sit beside one, and hold the launched file's name. */
export function leftovers(build: string, launched: string): string[] {
  const dirs = readdirSync(build, { recursive: true, encoding: 'utf8' })
    .filter((rel) => !SKIPPED.test(rel) && CONFIGS.includes(basename(rel)))
    .map((rel) => join(build, rel))
    .filter((full) => statSync(full).isDirectory());
  const stem = basename(launched).split('.')[0];
  return dirs
    .filter((d) => basename(d) < 'Release')
    .filter((d) => dirs.some((r) => basename(r) === 'Release' && dirname(r) === dirname(d)))
    .filter((d) => filesUnder(d).some((f) => basename(f).split('.')[0] === stem))
    .map((d) => `${relative(build, d)} sits beside Release and sorts first: a launcher that takes the first configuration opens it, not Release; delete it`);
}

/** What is wrong with the launched file: stale against the sources, and assets or markers not in its bytes. */
export function problems(launched: string, sources: readonly string[], assets: readonly string[], markers: readonly string[]): string[] {
  const built = newest(launched);
  const stale = sources
    .filter((src) => newest(src) > built)
    .map((src) => `stale: ${launched} (${new Date(built).toISOString()}) is older than ${src} (${new Date(newest(src)).toISOString()}): rebuild, and tell the user to relaunch`);
  const files = filesUnder(launched);
  // One file in memory at a time, and the search stops at the first file that holds the needle.
  const holds = (needle: Buffer): boolean => needle.length > 0 && files.some((f) => readFileSync(f).includes(needle));
  const missing = assets.map((a) => (!existsSync(a) ? `asset not found: ${a}` : holds(readFileSync(a)) ? '' : `asset not inside the launched file: ${a}: the build did not link its bytes`));
  const unmarked = markers.map((m) => (holds(Buffer.from(m)) ? '' : `marker not inside the launched file: "${m}"`));
  return [...stale, ...missing, ...unmarked].filter((line) => line !== '');
}

function main(args: readonly string[]): number {
  const [build, launched] = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'));
  const take = (flag: string): string[] => args.flatMap((a, i) => (a === flag && args[i + 1] !== undefined ? [args[i + 1] as string] : []));
  if (build === undefined || launched === undefined || !existsSync(build)) {
    console.error('usage: node .claude/tools/can-open.mjs <build folder> <launched file or bundle> [--source <folder>]... [--asset <file>]... [--marker <text>]...');
    return 2;
  }
  const absent = take('--source').filter((s) => !existsSync(s));
  if (absent.length > 0) { console.error(`can-open: --source folder not found: ${absent.join(', ')}`); return 2; }
  const file = resolve(launched);
  if (!existsSync(file)) { console.log(`can-open: the launched file does not exist: ${launched}`); return 1; }
  console.log(`launched: ${file}\nbuilt: ${new Date(newest(file)).toISOString()}`);
  const wrong = [...leftovers(resolve(build), file), ...problems(file, take('--source').map((s) => resolve(s)), take('--asset').map((s) => resolve(s)), take('--marker'))];
  console.log(wrong.length === 0 ? 'can-open: the launched file holds the change' : [`can-open: ${wrong.length} to fix`, ...wrong.map((w) => `  ${w}`)].join('\n'));
  return wrong.length === 0 ? 0 : 1;
}

if (isMain(import.meta.url)) process.exit(main(process.argv.slice(2)));
