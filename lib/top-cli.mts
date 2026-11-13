// `claude-packs top` (typescript order W8.9 item 4): the terminal monitor. It is the hook proxy's `top` command, so it is one Go binary
// built like the proxy: the user's cache copy when there is one, else the kit's own build under packs/base/hooks/bin. The command only
// finds the binary and gives it the terminal; with no binary for this machine it says why and exits 1.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';
import { cachedBinary, hostTarget, shippedBinary } from './proxy-binary.mts';

const KIT = fileURLToPath(new URL('..', import.meta.url));

/** The monitor's binary for this machine: the cache's, else the kit's; null when there is neither. */
export function topBinary(env: Env, kitRoot: string = KIT): string | null {
  const target = hostTarget();
  if (target === null) return null;
  return [cachedBinary(env, target), shippedBinary(kitRoot, target)].find((f) => existsSync(f)) ?? null;
}

/** Runs the monitor in `dir`'s project with `rest` (its flags and projects) on this terminal; its exit code is the command's. */
export function topCommand(dir: string, rest: readonly string[], env: Env = process.env, log: (line: string) => void = console.error): number {
  const binary = topBinary(env);
  if (binary === null) {
    log('top: no monitor binary for this machine (the kit builds one when Go is on PATH: npm run build)');
    return 1;
  }
  const run = spawnSync(binary, ['top', ...rest], { stdio: 'inherit', env: { ...env, CLAUDE_PROJECT_DIR: dir } });
  return run.status ?? 1;
}
