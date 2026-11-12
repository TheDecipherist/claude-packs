// KWB-197: after an `update` the calls are served by a daemon, not judged one by one by the TypeScript runner (typescript order W8,
// d-10). The socket's name holds the lock's hash, so a changed lock means no daemon for the new name: that one call falls back and
// starts a daemon, and the next calls are the daemon's. A burst of overlapping events (agents working at once) grows the pool, and the
// daemon must outlive it: one that ends at "400 MB resident" and starts again leaves each call to the fallback (157 ms) or to a cold
// daemon. Each case has a cache folder of its own and stops the daemon it started.
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { readHookLog } from '../../packs/base/hooks/lib/hook-log.mts';
import { toJson } from '../../packs/base/hooks/lib/json.mts';
import { PACKS_DIR } from '../../lib/packs.mts';
import { hostTarget, shippedBinary } from '../../lib/proxy-binary.mts';
import { installBinary } from '../../lib/proxy-install.mts';
import { fixture } from '../fixtures/installs.mts';
import { type ProxyRig, stopDaemon, until } from '../fixtures/proxy-rig.mts';
import { CLI, assert, test } from '../kit-cli.mts';

const target = hostTarget();
const KIT = join(PACKS_DIR, '..');
const skip = target !== null && existsSync(shippedBinary(KIT, target)) ? false : 'no proxy binary is built here (Go is not on PATH)';

function rig(): ProxyRig {
  const project = fixture('base');
  const cache = scratchDir('proxy-update-cache-');
  chmodSync(cache, 0o700);
  const env = { PATH: process.env.PATH ?? '', HOME: cache, CLAUDE_PROJECT_DIR: project, CLAUDE_PACKS_CACHE: cache };
  assert.equal(installBinary(KIT, env).kind, 'installed');
  return { project, cache, env };
}

const event = (r: ProxyRig, tool: 'Bash' | 'Write', n: number): string => toJson({
  session_id: 's', cwd: r.project, hook_event_name: 'PreToolUse', tool_name: tool,
  tool_input: tool === 'Bash' ? { command: `ls ${n}` } : { file_path: join(r.project, `src-${n}.txt`), content: `line ${n}\n` },
});
const picker = (r: ProxyRig): string[] => [join(r.project, '.claude', 'hooks', 'bin', 'hook-proxy'), '60'];
const fire = (r: ProxyRig, input: string): number | null => spawnSync('sh', picker(r), { input, encoding: 'utf8', env: r.env, cwd: r.project }).status;
const fireAsync = (r: ProxyRig, input: string): Promise<void> => new Promise((done) => {
  const child = spawn('sh', picker(r), { env: r.env, cwd: r.project, stdio: ['pipe', 'ignore', 'ignore'] });
  child.on('close', () => done());
  child.stdin.end(input);
});
/** The pid of the daemon the project's current lock names (0 when none runs): what `daemon status` says. */
const pidOf = (r: ProxyRig): number => Number(/running\s+pid (\d+)/.exec(spawnSync('node', [CLI, 'daemon', 'status', '--dir', r.project], { env: r.env, encoding: 'utf8' }).stdout)?.[1] ?? 0);
const sources = (r: ProxyRig): string[] => readHookLog(r.project).filter((l) => l.hook === 'event').map((l) => l.source ?? '-');

test('after the lock changes (an update) one call is judged by the runner and the next calls are the new daemon\'s', { skip, timeout: 90_000 }, async () => {
  const r = rig();
  let old = 0;
  try {
    fire(r, event(r, 'Bash', 0));
    await until('a daemon is listening', () => pidOf(r) > 0);
    old = pidOf(r);
    fire(r, event(r, 'Bash', 1));
    appendFileSync(join(r.project, '.claude', 'claude-packs.lock.json'), '\n');   // an update rewrites the lock: its hash, and so the daemon's name, is new
    const before = sources(r).length;
    for (let i = 2; i < 8; i += 1) { fire(r, event(r, 'Bash', i)); if (i === 2) await until('the new name has a daemon', () => pidOf(r) > 0 && pidOf(r) !== old); }
    const served = sources(r).slice(before);
    assert.equal(served[0], 'runner', `the first call after the lock changed: ${served.join(' ')}`);
    assert.deepEqual(served.slice(1), Array(served.length - 1).fill('daemon'), `every later call is the daemon's: ${served.join(' ')}`);
  } finally { stopDaemon(r); if (old > 0) try { process.kill(old, 'SIGTERM'); } catch { /* it ended itself */ } }
});

test('a burst of overlapping events does not end the daemon: no restart', { skip, timeout: 120_000 }, async () => {
  const r = rig();
  try {
    fire(r, event(r, 'Bash', 0));
    await until('a daemon is listening', () => pidOf(r) > 0);
    const first = pidOf(r);
    for (let round = 0; round < 3; round += 1) {
      await Promise.all(Array.from({ length: 32 }, (_, i) => fireAsync(r, event(r, i % 2 === 0 ? 'Write' : 'Bash', round * 100 + i))));
      await new Promise((d) => setTimeout(d, 2500));   // the daemon's watch ticks every second
      assert.equal(pidOf(r), first, `round ${round}: the daemon of the first call still serves (a restart is a new pid)`);
    }
  } finally { stopDaemon(r); }
});
