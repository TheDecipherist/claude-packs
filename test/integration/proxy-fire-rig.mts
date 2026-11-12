// What the proxy tests share for firing an event as Claude Code does: through the project's picker (stdin JSON, CLAUDE_PROJECT_DIR in the
// environment), and finding the daemon that served it.
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { join } from 'node:path';
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { PACKS_DIR } from '../../lib/packs.mts';
import { installBinary } from '../../lib/proxy-install.mts';
import { fixture } from '../fixtures/installs.mts';
import type { ProxyRig } from '../fixtures/proxy-rig.mts';
import { CLI, assert } from '../kit-cli.mts';

/** A scratch install of the js-ts configuration with the proxy binary installed in a cache folder of its own, and the environment the picker runs in. */
export function proxyRig(cachePrefix: string): ProxyRig {
  const project = fixture('js-ts');
  const cache = scratchDir(cachePrefix);
  chmodSync(cache, 0o700);
  const env = { PATH: process.env.PATH ?? '', HOME: cache, CLAUDE_PROJECT_DIR: project, CLAUDE_PACKS_CACHE: cache };
  assert.equal(installBinary(join(PACKS_DIR, '..'), env).kind, 'installed');
  return { project, cache, env };
}

const picker = (r: ProxyRig): string[] => [join(r.project, '.claude', 'hooks', 'bin', 'hook-proxy'), '60'];
/** One event (its JSON) through the picker, waited for: the exit code. */
export const fire = (r: ProxyRig, input: string): number | null => spawnSync('sh', picker(r), { input, encoding: 'utf8', env: r.env, cwd: r.project }).status;
/** The same, not waited for: resolves when the picker has exited. */
export const fireAsync = (r: ProxyRig, input: string): Promise<void> => new Promise((done) => {
  const child = spawn('sh', picker(r), { env: r.env, cwd: r.project, stdio: ['pipe', 'ignore', 'ignore'] });
  child.on('close', () => done());
  child.stdin.end(input);
});
/** The pid of the daemon the project's current lock names (0 when none runs): what `daemon status` says. */
export const pidOf = (r: ProxyRig): number => Number(/running\s+pid (\d+)/.exec(spawnSync('node', [CLI, 'daemon', 'status', '--dir', r.project], { env: r.env, encoding: 'utf8' }).stdout)?.[1] ?? 0);
