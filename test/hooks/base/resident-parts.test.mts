// resident/: the daemon's parts one by one: the folder and socket, the start lock and its ends, the state file, the index, the pool.
import { chmodSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { fingerprint } from '../../../packs/base/hooks/lib/near-copies.mts';
import { tmpKeyed } from '../../../packs/base/hooks/lib/hash.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { decodeReply, encodeRequest, PROTOCOL } from '../../../packs/base/hooks/lib/proxy-wire.mts';
import { residentIndex, mayHaveWritten } from '../../../packs/base/hooks/resident/index.mts';
import { daemonLog, takeStartLock, releaseStartLock, watch } from '../../../packs/base/hooks/resident/lifecycle.mts';
import { startPool } from '../../../packs/base/hooks/resident/pool.mts';
import { answers, listen, prepareFolder } from '../../../packs/base/hooks/resident/socket.mts';
import { readState, stateFile, type DaemonState } from '../../../packs/base/hooks/resident/state.mts';
import { assert, test } from '../../kit-cli.mts';

const UID = process.getuid?.() ?? 0;
const nap = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

test('the socket folder: made at 700 when absent; refused at 755, when another user\'s, and when it is a file', () => {
  const dir = join(scratchDir('resident-folder-'), 'c');
  assert.equal(prepareFolder(dir, UID), null);
  assert.equal(prepareFolder(dir, UID), null, 'and again');
  chmodSync(dir, 0o755);
  assert.match(prepareFolder(dir, UID) ?? '', /mode 755, not 700/);
  chmodSync(dir, 0o700);
  assert.match(prepareFolder(dir, UID + 1) ?? '', /not owned by this user/);
  const file = join(scratchDir('resident-folder-'), 'f');
  writeFileSync(file, '');
  assert.notEqual(prepareFolder(file, UID), null);
});

test('the start lock: one holder; a live holder keeps it, a dead one\'s is taken over, release frees it', () => {
  const lock = join(scratchDir('resident-lock-'), 'k.lock');
  assert.equal(takeStartLock(lock, process.pid), true);
  assert.equal(takeStartLock(lock, process.ppid), false, 'this process is alive and holds it');
  releaseStartLock(lock);
  writeFileSync(lock, '2147483646\n');   // a pid no process has
  assert.equal(takeStartLock(lock, process.pid), true, 'a dead holder\'s lock is taken over');
  assert.equal(readFileSync(lock, 'utf8'), `${process.pid}\n`);
});

test('the socket answers a request once; a dead file is replaced, and `answers` says whether something listens', async () => {
  const sock = join('/tmp', `rs-${process.pid}.sock`);
  writeFileSync(sock, 'left by a crash');
  assert.equal(await answers(sock), false);
  const seen: string[] = [];
  const up = await listen(sock, (incoming) => { seen.push(incoming.stdin.toString()); incoming.reply({ code: 2, stdout: 'o', stderr: 'e' }); }, () => undefined);
  assert.equal(await answers(sock), true);
  const got = await new Promise<Buffer>((done) => {
    const c = createConnection(sock);
    const parts: Buffer[] = [];
    c.on('connect', () => c.write(encodeRequest({ v: PROTOCOL, env: {}, cwd: '/', ppid: 1, deadline: Date.now() + 1000 }, 'STDIN')));
    c.on('data', (d: Buffer) => parts.push(d));
    c.on('close', () => done(Buffer.concat(parts)));
  });
  assert.deepEqual([seen, decodeReply(got).kind === 'whole' ? (decodeReply(got) as { value: unknown }).value : null], [['STDIN'], { code: 2, stdout: 'o', stderr: 'e' }]);
  await up.close();
  assert.equal(await answers(sock), false);
});

test('a request that is not one gets a crash reply, not silence', async () => {
  const sock = join('/tmp', `rs2-${process.pid}.sock`);
  const lines: string[] = [];
  const up = await listen(sock, () => undefined, (l) => lines.push(l));
  const got = await new Promise<Buffer>((done) => {
    const c = createConnection(sock);
    const parts: Buffer[] = [];
    c.on('connect', () => c.write(Buffer.concat([Buffer.from([0, 0, 0, 2]), Buffer.from('{}'), Buffer.from([0, 0, 0, 0])])));
    c.on('data', (d: Buffer) => parts.push(d));
    c.on('close', () => done(Buffer.concat(parts)));
  });
  const reply = decodeReply(got);
  assert.ok(reply.kind === 'whole' && reply.value.code === 1 && reply.value.fallback === 'ts');
  assert.match(lines.join(), /refused/);
  await up.close();
});

test('the daemon log rotates whole past its size, and never throws', () => {
  const dir = scratchDir('resident-log-');
  const log = daemonLog(join(dir, 'daemon-x.log'), 200);
  for (let i = 0; i < 30; i += 1) log(`line ${i} ${'x'.repeat(20)}`);
  assert.ok(readdirSync(dir).filter((f) => /^daemon-x-\d{8}-\d{6}.*\.log$/.test(f)).length > 0);
  assert.doesNotThrow(() => daemonLog(join(dir, 'absent', 'deeper', 'd.log'))('x'));
});

test('the watch ends an idle daemon, a day-old one and a large one, between events only', async () => {
  const stops: string[] = [];
  const base = { idleMs: 60_000, maxAgeMs: 60_000, maxRss: 1e12, tickMs: 10, started: Date.now(), last: () => Date.now(), busy: () => false, rss: () => 1, workers: () => 0, replaced: () => false, parentGone: () => false, stop: (why: string, again: boolean) => stops.push(`${why}|${again}`) };
  const idle = watch({ ...base, idleMs: 30, started: Date.now() - 1000, last: () => Date.now() - 1000 });
  await nap(60);
  clearInterval(idle);
  assert.match(stops[0] ?? '', /^idle for \d+ minutes\|false$/);
  stops.length = 0;
  const old = watch({ ...base, maxAgeMs: 30, started: Date.now() - 1000 });
  await nap(60);
  clearInterval(old);
  assert.equal(stops[0], '24 hours old|true');
  stops.length = 0;
  const big = watch({ ...base, maxRss: 10, rss: () => 500 * 1048576 });
  await nap(40);
  clearInterval(big);
  assert.equal(stops[0], '500 MB resident|true');
  stops.length = 0;
  // KWB-197: the workers are threads of this process, so a full pool of warm workers is resident too. It is not a leak: the limit grows
  // with the pool, and a daemon that ended at 500 MB with 16 workers ended after every burst, and left its calls to the fallback.
  const pooled = watch({ ...base, maxRss: 400 * 1048576, rss: () => 500 * 1048576, workers: () => 16 });
  await nap(40);
  clearInterval(pooled);
  assert.deepEqual(stops, [], '500 MB with 16 workers is the pool, not a leak');
  const leaking = watch({ ...base, maxRss: 400 * 1048576, rss: () => 2000 * 1048576, workers: () => 16 });
  await nap(40);
  clearInterval(leaking);
  assert.equal(stops[0], '2000 MB resident|true', 'a daemon past what its pool explains still ends');
  stops.length = 0;
  const replaced = watch({ ...base, replaced: () => true });
  await nap(40);
  clearInterval(replaced);
  assert.equal(stops[0], 'the lock changed: a new kit has its own daemon|false', 'an update ends the daemon named for the old lock, with no restart');
  stops.length = 0;
  const orphan = watch({ ...base, parentGone: () => true, busy: () => true });
  await nap(40);
  clearInterval(orphan);
  assert.equal(stops[0], 'the process it was started for is gone|false', 'a daemon started for a selftest ends with it, busy or not');
  stops.length = 0;
  const busy = watch({ ...base, idleMs: 1, started: Date.now() - 1000, last: () => 0, busy: () => true });
  await nap(40);
  clearInterval(busy);
  assert.deepEqual(stops, [], 'a hook running is never cut off');
});

test('the pid file is written by rename at most every interval unless forced, read back, removed', () => {
  const file = join(scratchDir('resident-state-'), 'k.pid');
  const state: DaemonState = { pid: 1, key: 'k', project: '/p', hooks: '/h', node: 'n', lockHash: 'l', started: 1, lastEvent: 0, events: 0, workers: 4, rss: 1, heap: 1 };
  const save = stateFile(file, 60_000);
  save.save(state);
  save.save({ ...state, events: 9 });
  assert.equal(readState(file)?.events, 0, 'the second write within the interval is skipped');
  save.save({ ...state, events: 9 }, true);
  assert.equal(readState(file)?.events, 9);
  save.remove();
  assert.equal(readState(file), null);
});

test('the index: built on the first query, the files holding a statement, stale after a PostToolUse that wrote', () => {
  const dir = scratchDir('resident-index-');
  const code = 'const total = items.reduce((sum, item) => sum + item.price * item.count, 0);\nconst label = names.map((name) => name.trim().toLowerCase()).join(", ");\n';
  put(join(dir, 'src/a.ts'), code);
  const hashes = fingerprint(code, '.ts').map(([h]) => h);
  assert.ok(hashes.length > 0);
  const index = residentIndex(dir, () => ({ folders: {}, concepts: {} }));
  assert.equal(index.size(), 0);
  assert.deepEqual(index.candidates(hashes).map((f) => f.file), ['src/a.ts']);
  put(join(dir, 'src/b.ts'), code);
  assert.deepEqual(index.candidates(hashes).map((f) => f.file), ['src/a.ts'], 'not read again until a write may have happened');
  index.stale();
  assert.deepEqual(index.candidates(hashes).map((f) => f.file).sort(), ['src/a.ts', 'src/b.ts']);
  assert.deepEqual(index.candidates(['nothing']), []);
  assert.deepEqual(['Write', 'Edit', 'Bash', 'Read'].map(mayHaveWritten), [true, true, true, false]);
});

test('the index warms in a worker thread of its own: the main thread is free meanwhile, and the kept index is there when it ends', async () => {
  const dir = scratchDir('resident-warm-');
  put(join(dir, 'src/a.ts'), 'const total = items.reduce((sum, item) => sum + item.price * item.count, 0);\nconst label = names.map((name) => name.trim().toLowerCase()).join(", ");\n');
  const index = residentIndex(dir, () => ({ folders: {}, concepts: {} }));
  const kept = tmpKeyed('claude-packs-repo-', dir, '.json');
  assert.equal(index.warming(), null, 'nothing warms until it is started');
  index.warm(new URL('../../../packs/base/hooks/resident/warm.mjs', import.meta.url));
  const warming = index.warming();
  assert.notEqual(warming, null, 'started: a query would wait for it');
  assert.equal(index.size(), 0, 'and the main thread has built nothing');
  await warming;
  assert.equal(index.warming(), null);
  assert.match(readFileSync(kept, 'utf8'), /src\/a\.ts/, 'the worker kept the index it built');
  assert.equal(index.size(), 0, 'the main thread reads it on its first query, not before');
  index.close();
});

// ---- the pool, on the real worker with a folder of three small hooks ----

const WORKER = new URL('../../../packs/base/hooks/resident/worker.mjs', import.meta.url);
function hooksDir(): string {
  const dir = scratchDir('resident-pool-');
  const say = (name: string, body: string): void => put(join(dir, `${name}.mjs`), `export async function hook(event, ctx) {\n${body}\n}\n`);
  say('ok', "return { code: 0, stdout: '', stderr: 'ok;' };");
  say('slow', "await new Promise((d) => setTimeout(d, 150));\nreturn { code: 0, stdout: '', stderr: '' };");
  say('leaves', 'process.exit(3);');
  say('writes-stream', "process.stderr.write('stray');\nreturn { code: 0, stdout: '', stderr: 'verdict only;' };");
  say('no-verdict', 'return 0;');
  say('logs', "ctx.log('a line');\nreturn { code: 0, stdout: '', stderr: '' };");
  return dir;
}
const poolOf = (dir: string, over: Partial<Parameters<typeof startPool>[0]> = {}, log: string[] = []): ReturnType<typeof startPool> =>
  startPool({ workerUrl: WORKER, data: { dir, hooks: ['ok', 'slow', 'leaves', 'writes-stream', 'no-verdict', 'logs', 'absent'], ext: '.mjs' }, warm: 2, preload: 1, max: 4, idleMs: 60_000, recycleAfter: 500, growAfterMs: 10, candidates: () => [], log: (l) => log.push(l), ...over });
const ctx = { projectDir: '/p', cwd: '/p', env: {}, sessionPid: 1, now: 0, layout: { folders: {}, concepts: {} } };
const job = (hook: string) => ({ hook, event: { hook_event_name: 'PreToolUse' }, ctx });

test('the pool: a hook\'s verdict, its ctx.log line, a hook that returns no Verdict or is missing is a crash, a stream write is not output', async () => {
  const pool = poolOf(hooksDir());
  try {
    assert.deepEqual(await pool.ready(), ['absent'], 'the hook that cannot be loaded is named, and the worker is up');
    const ok = await pool.run(job('ok'));
    assert.deepEqual([ok.code, ok.stderr, ok.stdout], [0, 'ok;', '']);
    assert.equal((await pool.run(job('writes-stream'))).stderr, 'verdict only;');
    assert.equal((await pool.run(job('logs'))).stderr, 'a line\n');
    const none = await pool.run(job('no-verdict'));
    assert.ok(none.code === 1 && none.stderr.includes('no-verdict failed: Error: no-verdict returned no Verdict'));
    assert.match((await pool.run(job('absent'))).stderr, /absent could not be loaded|absent failed/);
  } finally { await pool.close(); }
});

test('the pool: a worker that exits is replaced, its hook counted a crash, the size kept; a worker is recycled after its events', async () => {
  const log: string[] = [];
  const pool = poolOf(hooksDir(), { recycleAfter: 3 }, log);
  try {
    await pool.ready();
    const left = await pool.run(job('leaves'));
    assert.ok(left.code === 1 && left.stderr.includes('its worker exited (3) while it ran'));
    assert.equal(pool.size(), 2);
    assert.ok(log.some((l) => l.includes('replaced')));
    for (let i = 0; i < 12; i += 1) assert.equal((await pool.run(job('ok'))).code, 0);
    assert.equal(pool.size(), 2, 'recycled workers are replaced, never lost');
  } finally { await pool.close(); }
});

test('the pool grows under load to its limit and retires the grown ones after their idle time', async () => {
  const pool = poolOf(hooksDir(), { warm: 1, max: 4, idleMs: 100 });
  try {
    await pool.ready();
    await Promise.all(Array.from({ length: 8 }, () => pool.run(job('slow'))));
    assert.ok(pool.size() > 1 && pool.size() <= 4, `grew to ${pool.size()}`);
    for (let i = 0; i < 100 && pool.size() > 1; i += 1) await nap(50);
    assert.equal(pool.size(), 1, 'back to the warm one');
  } finally { await pool.close(); }
});

// W8.4, memory: a worker holds the hooks it has run; the first `preload` workers import them all at start.
test('the pool: only a preloaded worker imports every hook at start; the others import a hook when a job first brings it', async () => {
  const pool = poolOf(hooksDir(), { warm: 3, preload: 1 });
  try {
    assert.deepEqual(await pool.ready(), ['absent'], 'the preloaded worker names the hook that cannot be loaded');
    assert.deepEqual(['ok', 'slow', 'logs'].map((h) => pool.holders(h)), [1, 1, 1], 'one worker holds each hook at start, of three');
  } finally { await pool.close(); }
  const lazy = poolOf(hooksDir(), { warm: 2, preload: 0 });
  try {
    assert.deepEqual(await lazy.ready(), [], 'nothing imported yet, so nothing failed to');
    assert.equal(lazy.holders('ok'), 0);
    assert.equal((await lazy.run(job('ok'))).code, 0);
    assert.deepEqual([lazy.holders('ok'), lazy.holders('slow')], [1, 0], 'the one hook a job brought, in one worker');
    assert.match((await lazy.run(job('absent'))).stderr, /absent could not be loaded/);
  } finally { await lazy.close(); }
});

test('the pool: a hook stays on the workers that hold it while fewer than `spread` do; a job held back is never starved', async () => {
  const pool = poolOf(hooksDir(), { warm: 4, preload: 0, spread: 1 });
  try {
    await pool.ready();
    for (let i = 0; i < 6; i += 1) assert.equal((await pool.run(job('ok'))).code, 0);
    assert.equal(pool.holders('ok'), 1, 'six jobs in turn, one holder');
    // three at once for a 150 ms hook: the two behind the holder wait 50 ms, then idle workers import it
    const began = Date.now();
    const done = await Promise.all(Array.from({ length: 3 }, () => pool.run(job('slow'))));
    assert.deepEqual(done.map((d) => d.code), [0, 0, 0]);
    assert.ok(Date.now() - began < 450, `the jobs ran ${Date.now() - began} ms: they waited past the spread wait and were not starved`);
    assert.ok(pool.holders('slow') > 1, `held back for the holder, then spread: ${pool.holders('slow')} holders`);
  } finally { await pool.close(); }
});
