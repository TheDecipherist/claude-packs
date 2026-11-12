// What the tests of the Go proxy share (typescript order W8): stopping the daemon a case started, and waiting for a condition.
import { spawnSync } from 'node:child_process';
import { CLI, assert } from '../kit-cli.mts';

/** A project, the cache folder its daemon lives in, and the environment the picker runs in. */
export interface ProxyRig { project: string; cache: string; env: Record<string, string> }

export const stopDaemon = (r: ProxyRig): void => { spawnSync('node', [CLI, 'daemon', 'stop', '--dir', r.project], { env: r.env }); };

export async function until(what: string, done: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !done(); i += 1) await new Promise((d) => setTimeout(d, 50));
  assert.ok(done(), what);
}
