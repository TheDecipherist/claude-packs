// The install's half of the hook proxy (typescript order W8.2, d-13, review-2-go 3.5): this machine's binary goes from the kit's package
// into the user's cache, where the project's `sh` picker finds it. By copy to a temporary name in the same folder and `rename`, never
// written in place: a signed binary changed in place is killed by the kernel on Apple silicon ("Killed: 9") until it is a new inode.
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';
import { cachedBinary, hostTarget, shippedBinary } from './proxy-binary.mts';

/** What installing came to: the cache has the kit's binary now (`installed`), had it already (`same`), or the kit has none for this machine. */
export type Installed = { kind: 'installed' | 'same'; file: string } | { kind: 'none'; why: string };

export function installBinary(kitRoot: string, env: Env, platform: string = process.platform, arch: string = process.arch): Installed {
  const target = hostTarget(platform, arch);
  if (target === null) return { kind: 'none', why: `no client is built for ${platform}-${arch}` };
  const src = shippedBinary(kitRoot, target);
  if (!existsSync(src)) return { kind: 'none', why: `the kit holds no binary at ${src} (a build without Go, or an unbuilt checkout)` };
  const dest = cachedBinary(env, target);
  if (existsSync(dest) && readFileSync(dest).equals(readFileSync(src))) return { kind: 'same', file: dest };
  // the cache folder is the resident runner's folder too on Linux, which refuses one that is not mode 700: made so, and kept so
  const root = dirname(dirname(dirname(dest)));
  mkdirSync(dirname(dest), { recursive: true, mode: 0o700 });
  chmodSync(root, 0o700);
  const temp = `${dest}.${process.pid}.new`;
  try {
    copyFileSync(src, temp);
    chmodSync(temp, 0o755);
    renameSync(temp, dest);
  } catch (e) {
    rmSync(temp, { force: true });
    return { kind: 'none', why: e instanceof Error ? e.message : String(e) };
  }
  return { kind: 'installed', file: dest };
}
