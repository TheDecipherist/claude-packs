// What the proxy tests share for firing an event as Claude Code does: through the project's picker (stdin JSON, CLAUDE_PROJECT_DIR in the
// environment), and finding the daemon that served it.
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import type { ProxyRig } from '../fixtures/proxy-rig.mts';
import { CLI } from '../kit-cli.mts';

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
