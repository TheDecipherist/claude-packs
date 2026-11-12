// doctor's constant checks (typescript order W8.4, d-9): a check whose answer depends only on the kit (a tool proving itself with its own
// planted faults) is run once per kit version, node version and tool bytes, then remembered in the selftest cache like a hook's passed selftest;
// `doctor --fresh` runs it again. A failure is never remembered.
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkoutVersion } from '../packs/base/hooks/lib/kit-version.mts';
import { proved, remember, selftestKey, type CacheEnv } from './selftest-cache.mts';

/** The kit's own version, from the package.json above lib/ (the same place in a checkout and in the installed package). */
export const kitVersion = (): string => checkoutVersion(join(dirname(fileURLToPath(import.meta.url)), '..')) ?? 'unknown';

/** The key of a constant check: its name, the kit version, node's, and the bytes of the file it runs and everything that file imports. */
export const constantKey = (name: string, file: string): string =>
  createHash('sha256').update(`${name}\0${selftestKey(file, `${kitVersion()}\0${process.version}\0${process.platform}`)}`).digest('hex');

/** The problems `run` returns, unless this check passed before for this kit and these bytes (and `fresh` is not asked). */
export function constantOnce(name: string, file: string, env: CacheEnv, fresh: boolean, run: () => string[]): string[] {
  const key = constantKey(name, file);
  if (!fresh && proved(key, env)) return [];
  const problems = run();
  if (problems.length === 0) remember(key, env);
  return problems;
}
