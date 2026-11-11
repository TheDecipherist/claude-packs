// What the doctor-cache files share: doctor run with its selftests on, how many it took as unchanged, and a base install cut to ten hooks
// (W5-h: the 30 of a whole base install take 28 s to prove and the subject, what the cache remembers, does not depend on how many).
import { CLI, fresh, keepHooks, spawnSync } from '../kit-cli.mts';
import type { Spawned } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';

export const doctor = (dir: string, cache: string, ...args: string[]): Spawned =>
  spawnSync('node', [CLI, 'doctor', '--dir', dir, ...args], { encoding: 'utf8', env: { ...process.env, CLAUDE_PACKS_SELFTEST_CACHE: cache, CLAUDE_PACKS_SELFTESTS: 'run' } });
export const unchanged = (out: string): number => Number(out.match(/selftests: (\d+) of \d+ unchanged/)?.[1] ?? 0);

// The fixture is a copy, so the cache store starts empty; the first doctor (the init of the old flow proved them too) fills it.
export const install = (): { dir: string; cache: string } => {
  const dir = keepHooks(fixture('base'));
  const cache = fresh('dcache-store-');
  doctor(dir, cache);
  return { dir, cache };
};
