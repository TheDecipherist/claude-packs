// Where the hook proxy's binary is (typescript order W8.2, d-13): the kit ships one per platform under packs/base/hooks/bin/OS-ARCH/,
// and the install puts the machine's own into the user's cache, where the `sh` picker in the project (.claude/hooks/bin/hook-proxy)
// finds it. A project's git never holds a binary (review-2 3.6, 5.1).
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Env } from '../packs/base/hooks/lib/types.d.mts';

export const TARGETS = ['darwin-arm64', 'darwin-amd64', 'linux-arm64', 'linux-amd64'] as const;
export type Target = (typeof TARGETS)[number];
export const BINARY = 'hook-proxy';

/** The target name Node's platform and arch make (darwin-arm64, linux-amd64), or null where no client is built. */
export function hostTarget(platform: string = process.platform, arch: string = process.arch): Target | null {
  const name = `${platform}-${arch === 'x64' ? 'amd64' : arch}`;
  return TARGETS.find((t) => t === name) ?? null;
}

/** The user's cache of binaries: CLAUDE_PACKS_CACHE (a test's own) or ~/.cache/claude-packs, then bin/OS-ARCH/hook-proxy. The picker reads the same. */
export const cachedBinary = (env: Env, target: Target, home: string = homedir()): string => join(env.CLAUDE_PACKS_CACHE ?? join(home, '.cache', 'claude-packs'), 'bin', target, BINARY);

/** The kit's own built binary for a target, under the pack's hooks/bin (`kitRoot`: the kit's checkout, or an installed package). */
export const shippedBinary = (kitRoot: string, target: Target): string => join(kitRoot, 'packs', 'base', 'hooks', 'bin', target, BINARY);
