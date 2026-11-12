// W10b review findings 8 to 20: the daemon's error paths closed and its state owned (a failed listen, a connection that stalls, a
// start that says busy or ready, the start lock's takeover, killGroup's pid, a failed re-exec or sampler, buildOne's temp name,
// the usage store and the process handlers of one serve).
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { setTimeout as nap } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { killGroup } from '../../../packs/base/hooks/lib/child-group.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { startDaemon } from '../../../packs/base/hooks/lib/proxy-client.mts';
import { serve, serveOptions, type Host } from '../../../packs/base/hooks/resident.mts';
import { reexec, takeStartLock } from '../../../packs/base/hooks/resident/lifecycle.mts';
import { startSampling } from '../../../packs/base/hooks/resident/sampling.mts';
import { listen } from '../../../packs/base/hooks/resident/socket.mts';
import { UsageStore } from '../../../packs/base/hooks/resident/usage.mts';
import { PLANTS } from '../../../packs/base/hooks/resident/selftest-plants.mts';
import { filesOf, makeRig, start, stopAll, waitFor } from '../../../packs/base/hooks/resident/selftest-rig.mts';
import { KIT, assert, test } from '../../kit-cli.mts';

const scratchScript = (body: string): string => { const f = join(scratchDir('paths-script-'), 'child.mjs'); put(f, body); return f; };

test('finding 8: a daemon whose listen fails frees its start lock, ends, and says why on the ready pipe', async () => {
  const rig = makeRig(PLANTS, {}, 'paths-listen-');
  try {
    mkdirSync(filesOf(rig).socket, { recursive: true });   // a folder where the socket is to be made: listen fails
    const started = await start(rig);
    assert.equal(started.kind, 'failed');
    assert.match(started.kind === 'failed' ? started.why : '', /listen/);
    assert.equal(existsSync(filesOf(rig).lock), false, 'the start lock is released');
  } finally { await stopAll(rig); }
});

test('findings 18, 19, 20: one serve owns its usage store, and its handlers and timers go with its stop', async () => {
  const rig = makeRig(PLANTS, {}, 'paths-serve-');
  const sampler = join(rig.dir, 'sampler.sh');
  writeFileSync(sampler, `#!/bin/sh\nwhile :; do echo '{"at":1,"dt":1,"self":0,"source":"t","procs":[{"pid":5,"ppid":1,"cpu":0.5,"rss":1048576,"comm":"claude","cwd":"/","args":"","orphan":false,"claude":true}]}'; sleep 0.2; done\n`);
  chmodSync(sampler, 0o755);
  const host: Host = { env: { HOME: rig.dir, PATH: process.env.PATH, CLAUDE_PACKS_CACHE: rig.cache }, uid: process.getuid?.() ?? 0, home: rig.dir, platform: process.platform, node: process.execPath, script: '' };
  const options = serveOptions(['--serve', rig.dir, '--hooks', rig.hooks, '--pool', '2', '--no-npm', '--proxy', sampler, '--sample-ms', '200'], host);
  assert.ok(options !== null);
  const events = ['SIGTERM', 'SIGINT', 'SIGHUP', 'uncaughtException', 'unhandledRejection'] as const;
  const listeners = (): number[] => events.map((e) => process.listenerCount(e));
  const timers = (): number => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length;
  const store = new UsageStore();
  const before = { listeners: listeners(), timers: timers() };
  try {
    const running = serve(options, host, store);
    assert.equal(await waitFor(() => Object.keys(store.all()).length > 0, 6000), true, 'the snapshots reach the store the serve was given');
    process.emit('SIGTERM');
    assert.equal(await running, 0);
    assert.deepEqual(listeners(), before.listeners, 'the process handlers are taken off');
    assert.ok(timers() <= before.timers, 'no interval of the serve is left');
  } finally { await stopAll(rig); }
});

test('finding 10: a connection that sends nothing, or a part of a request, is closed after the request deadline; a request taken is not', async () => {
  const sock = join('/tmp', `rp-${process.pid}.sock`);
  const up = await listen(sock, (incoming) => { setTimeout(() => incoming.reply({ code: 0, stdout: 'late', stderr: '' }), 400); }, () => undefined, 150);
  try {
    const closes = (c: ReturnType<typeof createConnection>): Promise<boolean> => Promise.race([new Promise<boolean>((d) => c.on('close', () => d(true))), nap(1500).then(() => false)]);
    assert.equal(await closes(createConnection(sock)), true, 'silent');
    const partial = createConnection(sock);
    partial.on('connect', () => partial.write(Buffer.from([0, 0])));
    assert.equal(await closes(partial), true, 'two bytes of a header');
    const whole = createConnection(sock);
    const got: Buffer[] = [];
    whole.on('data', (d: Buffer) => got.push(d));
    whole.on('connect', () => whole.write(Buffer.concat([Buffer.from([0, 0, 0, 2]), Buffer.from('{}'), Buffer.from([0, 0, 0, 0])])));
    await closes(whole);
    assert.ok(Buffer.concat(got).length > 0, 'an answer comes to a request taken whole');
  } finally { await up.close(); }
});

test('finding 12: a daemon that says ready or busy and exits at once is read as that, and a failed word keeps its reason', async () => {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME };
  const say = (word: string): string => scratchScript(`import { writeSync } from 'node:fs'; writeSync(3, ${toJson(word)}); process.exit(0);`);
  const kinds: string[] = [];
  for (let i = 0; i < 10; i += 1) kinds.push((await startDaemon({ node: process.execPath, script: say('ready 77\n'), args: [], env, waitMs: 5000 })).kind);
  assert.deepEqual([...new Set(kinds)], ['ready']);
  assert.equal((await startDaemon({ node: process.execPath, script: say('busy\n'), args: [], env, waitMs: 5000 })).kind, 'busy');
  const failed = await startDaemon({ node: process.execPath, script: say('failed listen boom\n'), args: [], env, waitMs: 5000 });
  assert.match(failed.kind === 'failed' ? failed.why : '', /boom/);
  assert.equal((await startDaemon({ node: process.execPath, script: say(''), args: [], env, waitMs: 5000 })).kind, 'failed');
});

test('finding 13: a stale start lock is taken over by one process only; a takeover in progress by a live one makes the taker back off', async () => {
  const dir = scratchDir('paths-lock-');
  const lock = join(dir, 'k.lock');
  writeFileSync(lock, '2147483646\n');
  writeFileSync(`${lock}.takeover`, `${process.ppid}\n`);   // a live process is taking over this lock
  assert.equal(takeStartLock(lock, process.pid), false);
  assert.equal(existsSync(`${lock}.takeover`), true, 'and its guard is not the taker\'s to remove');
  const child = (file: string): string => `import { takeStartLock } from ${toJson(pathToFileURL(join(KIT, 'packs/base/hooks/resident/lifecycle.mts')).href)}; console.log(takeStartLock(${toJson(file)}, process.pid)); setTimeout(() => process.exit(0), 2500);`;
  for (let round = 0; round < 3; round += 1) {
    const file = join(dir, `r${round}.lock`);
    writeFileSync(file, '2147483646\n');
    const wins: string[] = [];
    const kids = Array.from({ length: 8 }, () => spawn(process.execPath, ['--input-type=module', '-e', child(file)], { stdio: ['ignore', 'pipe', 'inherit'] }));
    for (const k of kids) k.stdout.on('data', (d: Buffer) => wins.push(String(d).trim()));
    await waitFor(() => wins.length === 8, 15_000);
    for (const k of kids) k.kill('SIGKILL');
    assert.equal(wins.filter((w) => w === 'true').length, 1, `round ${round}: ${wins.join()}`);
  }
});

test('finding 14: killGroup signals no group for a pid that is 0, 1, negative, fractional or not a number', () => {
  const signalled: unknown[] = [];
  const real = process.kill;
  process.kill = ((pid: number, signal?: string | number) => { signalled.push([pid, signal]); return true; }) as typeof process.kill;
  try { for (const pid of [0, 1, -1, -7, 1.5, Number.NaN]) assert.equal(killGroup(pid), false, String(pid)); } finally { process.kill = real; }
  assert.deepEqual(signalled, []);
});

test('finding 16: a failed re-exec and a sampler that cannot start are logged, not thrown; the sampler is tried again', async () => {
  const lines: string[] = [];
  assert.equal(await reexec('/nonexistent/node', [], {}, (l) => lines.push(l)), false);
  assert.match(lines.join(), /re-exec|start/);
  const sampling = startSampling({ proxy: '/nonexistent/hook-proxy', project: scratchDir('paths-sampler-'), intervalMs: 100, orphanMs: 1000, testMs: 1000, log: (l) => lines.push(l), env: {}, store: new UsageStore(), restartMs: 20 });
  await nap(600);
  sampling.stop();
  assert.ok(lines.filter((l) => /sampler could not start/.test(l)).length >= 2, lines.join('\n'));
});

test('finding 17: two builds in one folder never share a temp name', async () => {
  const build = await import('../../../scripts/build-proxy.mts') as { tempOf?: (final: string) => string };
  assert.equal(typeof build.tempOf, 'function');
  const a = build.tempOf?.('/x/hook-proxy') ?? '';
  const b = build.tempOf?.('/x/hook-proxy') ?? '';
  assert.ok(a !== b && a.startsWith('/x/hook-proxy.') && a.endsWith('.new'), `${a} ${b}`);
});
