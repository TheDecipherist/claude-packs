// W10b findings 1 to 7: the wire's constants have one owner (packs/base/hooks/lib/proxy-wire-table.mts), Go's file is generated from it,
// and a second copy of an owned value is red. Also: one `alive`, one environment list, the daemon's flags kept by a re-exec, one
// hooks.log column list, one binary cache.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { hookLogLine } from '../../../packs/base/hooks/lib/hook-log.mts';
import { alive as lifecycleAlive } from '../../../packs/base/hooks/resident/lifecycle.mts';
import { alive } from '../../../packs/base/hooks/lib/daemon-find.mts';
import { binaryCache, daemonFiles, keepEnv, socketFolders } from '../../../packs/base/hooks/lib/proxy-wire.mts';
import { WIRE } from '../../../packs/base/hooks/lib/proxy-wire-table.mts';
import { serveOptions, type Host } from '../../../packs/base/hooks/resident.mts';
import { cachedBinary } from '../../../lib/proxy-binary.mts';
import { renderWireGo, secondCopies, wireGoCurrent, writeWireGo } from '../../../scripts/wire-gen.mts';

const KIT = fileURLToPath(new URL('../../..', import.meta.url));

test('proxy/wire_gen.go is the table\'s rendering, and a hand-edited one is not', () => {
  assert.ok(wireGoCurrent(KIT), 'run node scripts/wire-gen.mts');
  const root = scratchDir('wire-gen');
  mkdirSync(join(root, 'proxy'));
  writeWireGo(root);
  assert.equal(readFileSync(join(root, 'proxy', 'wire_gen.go'), 'utf8'), renderWireGo());
  writeFileSync(join(root, 'proxy', 'wire_gen.go'), renderWireGo().replace(`maxSocketPath = ${WIRE.maxSocketPath}`, 'maxSocketPath = 99'));
  assert.equal(wireGoCurrent(root), false);
});

test('the kit holds no second copy of an owned value; a planted one in a participant, or in a Go file, is found', () => {
  assert.deepEqual(secondCopies(KIT), []);
  const root = scratchDir('wire-plant');
  mkdirSync(join(root, 'proxy'), { recursive: true });
  mkdirSync(join(root, 'packs/base/hooks/lib'), { recursive: true });
  writeFileSync(join(root, 'packs/base/hooks/lib/daemon-find.mts'), "const socket = `${key}.sock`;\n// a comment may say .sock\n");
  writeFileSync(join(root, 'proxy/client.go'), 'var lock = ".claude/claude-packs.lock.json"\n');
  const found = secondCopies(root).map((c) => `${c.file}:${c.value}`).sort();
  assert.deepEqual(found, ['packs/base/hooks/lib/daemon-find.mts:.sock', 'proxy/client.go:.claude/claude-packs.lock.json']);
});

test('a socket path comes from the owner: daemonFiles, the folders daemonsOf reads, and the pid file agree', () => {
  const host = { env: { XDG_RUNTIME_DIR: '/run/u' }, home: '/h', platform: 'linux', uid: 7 };
  const [first, second] = socketFolders(host);
  assert.equal(first, '/run/u/claude-packs');
  assert.equal(second, `/tmp/${WIRE.tmpPrefix}7`);
  assert.ok(daemonFiles(first ?? '', 'abc', 7).socket.endsWith(`abc${WIRE.suffix.socket}`));
});

test('the binary cache is one function; the sh picker\'s default is the same line', () => {
  assert.equal(binaryCache({}, '/h'), '/h/.cache/claude-packs');
  assert.equal(binaryCache({ CLAUDE_PACKS_CACHE: '/c' }, '/h'), '/c');
  assert.equal(cachedBinary({}, 'darwin-arm64', '/h'), '/h/.cache/claude-packs/bin/darwin-arm64/hook-proxy');
  const sh = readFileSync(join(KIT, 'packs/base/hooks/bin/hook-proxy'), 'utf8');
  assert.ok(sh.includes('${CLAUDE_PACKS_CACHE:-$HOME/.cache/claude-packs}/bin/$target/hook-proxy'));
});

test('a detached child keeps the table\'s environment names and no others', () => {
  const env = { HOME: '/h', PATH: '/p', CLAUDE_PACKS_CACHE: '/c', XDG_RUNTIME_DIR: '/x', SECRET: 's', CLAUDE_PROJECT_DIR: '/q' };
  assert.deepEqual(keepEnv(env, WIRE.daemonKeeps), { HOME: '/h', PATH: '/p', CLAUDE_PACKS_CACHE: '/c', XDG_RUNTIME_DIR: '/x' });
  assert.deepEqual(keepEnv({ HOME: '/h' }, WIRE.samplerKeeps), { HOME: '/h' });
});

test('alive has one owner: the resident lifecycle\'s is daemon-find\'s', () => {
  assert.equal(lifecycleAlive, alive);
  assert.equal(alive(process.pid), true);
});

test('hooks.log: a line has the table\'s columns, with queue and source only when a source is given', () => {
  const full = hookLogLine({ event: 'Stop', hook: 'proxy', ms: 12, code: 0, tool: '-', queue: 0, source: 'proxy' }).trimEnd().split('\t');
  assert.equal(full.length, WIRE.hooksLog.columns.length);
  assert.deepEqual(full.slice(1), ['Stop', 'proxy', '12', '0', '-', '0', 'proxy']);
  assert.equal(hookLogLine({ event: 'Stop', hook: 'x', ms: 1, code: 0 }).trimEnd().split('\t').length, WIRE.hooksLog.columns.length - WIRE.hooksLog.optional.length);
});

test('a re-exec keeps every flag the daemon was given, and never the ready pipe', () => {
  const host: Host = { env: {}, uid: 1, home: '/h', platform: 'linux', node: 'node', script: '/k/resident.mjs' };
  const argv = ['--serve', '/p', '--ready-fd', '3', '--max-rss-mb', '123', '--recycle-after', '9', '--state-ms', '50', '--sample-ms', '70', '--watchdog-ms', '80', '--test-ms', '90', '--hooks', '/k', '--pool', '2', '--idle-minutes', '4', '--exit-with', '77', '--proxy', '/bin/hp', '--no-npm'];
  const o = serveOptions(argv, host);
  assert.ok(o);
  assert.deepEqual([...o.again].slice(0, 3), ['/k/resident.mjs', '--serve', '/p']);
  const again = serveOptions(o.again.slice(1), host);
  assert.ok(again);
  assert.deepEqual({ ...again, readyFd: null, again: [] }, { ...o, readyFd: null, again: [] });
  assert.equal(o.again.includes('--ready-fd'), false);
  assert.equal(o.maxRss, 123 * 1048576);
  assert.equal(o.recycleAfter, 9);
  assert.equal(o.testMs, 90);
});

test('the Go client reads the same table: go vet is clean over the generated constants', { skip: spawnSync('go', ['version']).status !== 0 }, () => {
  const r = spawnSync('go', ['vet', '.'], { cwd: join(KIT, 'proxy'), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
