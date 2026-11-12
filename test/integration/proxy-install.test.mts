// The Go proxy through an install (typescript order W8.2, d-13): the `sh` picker that settings.json runs, the binary in the user's
// cache, and what each path answers. Every case sets CLAUDE_PACKS_CACHE to a folder of its own (mode 700), so no user file is read or
// written, and stops the daemon its events started.
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { put, scratchDir } from '../../packs/base/hooks/lib/files.mts';
import { readJson, toJson } from '../../packs/base/hooks/lib/json.mts';
import { readHookLog } from '../../packs/base/hooks/lib/hook-log.mts';
import { TABLE_FILE } from '../../packs/base/hooks/lib/hook-table.mts';
import { PACKS_DIR } from '../../lib/packs.mts';
import { cachedBinary, hostTarget, shippedBinary } from '../../lib/proxy-binary.mts';
import { installBinary } from '../../lib/proxy-install.mts';
import { fixture } from '../fixtures/installs.mts';
import { stopDaemon, until } from '../fixtures/proxy-rig.mts';
import { CLI, assert, readFileSync, test, writeFileSync } from '../kit-cli.mts';

const target = hostTarget();
const KIT = join(PACKS_DIR, '..');
const built = target !== null && existsSync(shippedBinary(KIT, target));
const skip = built ? false : 'no proxy binary is built here (Go is not on PATH)';

// a hook that refuses `rm -rf` the way a guard does, in a project that has the kit's table
const PLANT = "export function hook(event, ctx) {\n  const c = event.tool_input?.command ?? '';\n  return /\\brm\\s+-rf\\b/.test(c) ? { code: 2, stdout: '', stderr: 'BLOCKED by plant-rm: rm -rf\\n' } : { code: 0, stdout: '', stderr: '' };\n}\n";
const RM = toJson({ session_id: 's', cwd: '/', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'rm -rf /tmp/some-folder' } });
const FIND = toJson({ session_id: 's', cwd: '/', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'find / -name x' } });   // no-find refuses it
const LS =toJson({ session_id: 's', cwd: '/', hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } });

interface Rig { project: string; cache: string; env: Record<string, string> }

/** An install of base with the planted hook in its table, and a cache folder at mode 700 that holds the machine's binary (or not). */
function rig(withBinary: boolean, planted = true): Rig {
  const project = fixture('base');
  if (planted) {   // an `update` regenerates the table, so the case that updates goes without the plant and uses a refusal of the kit's own
    put(join(project, '.claude', 'hooks', 'plant-rm.mjs'), PLANT);
    const table = readJson<unknown[]>(join(project, '.claude', 'hooks', TABLE_FILE)) ?? [];
    table.push({ hook: 'plant-rm', events: ['PreToolUse'], matcher: 'Bash', role: 'judge' });
    writeFileSync(join(project, '.claude', 'hooks', TABLE_FILE), toJson(table));
  }
  const cache = scratchDir('proxy-cache-');
  chmodSync(cache, 0o700);
  const env = { PATH: process.env.PATH ?? '', HOME: cache, CLAUDE_PROJECT_DIR: project, CLAUDE_PACKS_CACHE: cache };
  if (withBinary) assert.equal(installBinary(KIT, env).kind, 'installed');
  return { project, cache, env };
}

/** The picker as settings.json runs it: `sh <picker> <timeout>`, the event on stdin. */
function fire(r: Rig, event: string, env: Record<string, string> = r.env): { code: number | null; stdout: string; stderr: string } {
  const run = spawnSync('sh', [join(r.project, '.claude', 'hooks', 'bin', 'hook-proxy'), '60'], { input: event, encoding: 'utf8', env, cwd: r.project });
  return { code: run.status, stdout: run.stdout, stderr: run.stderr };
}

const sources = (r: Rig): string[] => readHookLog(r.project).filter((l) => l.hook === 'event' || l.hook === 'proxy').map((l) => `${l.hook}:${l.source ?? '-'}`);

test('an install with no binary in the cache runs the TypeScript runner through the picker, and refuses rm -rf', () => {
  const r = rig(false);
  const refused = fire(r, RM);
  assert.equal(refused.code, 2);
  assert.match(refused.stderr, /BLOCKED by plant-rm/);
  assert.equal(fire(r, LS).code, 0);
  assert.deepEqual(sources(r), ['event:runner', 'event:runner'], 'the runner judged both; the proxy was never run');
});

test('the first event of a session with no daemon is judged by the fallback: rm -rf is refused, and the next is served by the daemon', { skip, timeout: 60_000 }, async () => {
  const r = rig(true);
  try {
    const first = fire(r, RM);
    assert.equal(first.code, 2, `exit ${first.code}: ${first.stderr}`);
    assert.match(first.stderr, /BLOCKED by plant-rm/);
    await until('a daemon is listening', () => spawnSync('node', [CLI, 'daemon', 'status', '--dir', r.project], { env: r.env, encoding: 'utf8' }).stdout.includes('running'));
    const second = fire(r, RM);
    assert.equal(second.code, 2);
    assert.match(second.stderr, /BLOCKED by plant-rm/);
    assert.equal(fire(r, LS).code, 0);
    const log = sources(r);
    assert.deepEqual(log.filter((s) => s.startsWith('proxy')).length, 3, `a proxy line per call: ${log.join(' ')}`);
    assert.ok(log.includes('event:runner') && log.includes('event:daemon'), `the first by the runner, the rest by the daemon: ${log.join(' ')}`);
  } finally { stopDaemon(r); }
});

test('the picker under a planted uname of Linux x86_64 on this machine runs the TypeScript runner, never the darwin binary', { skip }, () => {
  const r = rig(true);
  const bin = scratchDir('planted-uname-');
  put(join(bin, 'uname'), '#!/bin/sh\ncase "$*" in *r*) echo "Linux 5.15.0 x86_64" ;; *) echo "Linux x86_64" ;; esac\n');
  chmodSync(join(bin, 'uname'), 0o755);
  const out = fire(r, RM, { ...r.env, PATH: `${bin}:${r.env.PATH}` });
  assert.equal(out.code, 2);
  assert.match(out.stderr, /BLOCKED by plant-rm/);
  assert.deepEqual(sources(r), ['event:runner']);
});

test('the picker under a planted macOS 11 runs the TypeScript runner: Go\'s minimum is 12', { skip: target?.startsWith('darwin') ? skip : 'not a Mac' }, () => {
  const r = rig(true);
  const bin = scratchDir('planted-uname-old-');
  put(join(bin, 'uname'), '#!/bin/sh\necho "Darwin 20.6.0 arm64"\n');   // macOS 11
  chmodSync(join(bin, 'uname'), 0o755);
  const out = fire(r, RM, { ...r.env, PATH: `${bin}:${r.env.PATH}` });
  assert.equal(out.code, 2);
  assert.deepEqual(sources(r), ['event:runner']);
});

test('two updates in a row with the client run after each: no Killed: 9, and a binary changed in the cache is replaced by a new file', { skip, timeout: 120_000 }, async () => {
  const r = rig(true, false);
  if (target === null) return;
  const cached = cachedBinary(r.env, target);
  const update = (): number | null => spawnSync('node', [CLI, 'update', '--dir', r.project], { env: r.env, encoding: 'utf8' }).status;
  try {
    for (const round of [1, 2]) {
      assert.equal(update(), 0, `update ${round}`);
      const out = fire(r, FIND);
      assert.equal(out.code, 2, `after update ${round}: exit ${out.code} ${out.stderr}`);
    }
    const before = statSync(cached).ino;
    assert.equal(statSync(cached).ino, before, 'an identical binary is left where it is');
    // a byte changed in the cached copy (a signed binary changed breaks its signature): the update puts the kit's, as a new inode
    const bytes = readFileSync(cached);
    writeFileSync(cached, Buffer.concat([bytes, Buffer.from([0])]));
    assert.equal(update(), 0);
    assert.notEqual(statSync(cached).ino, before, 'replaced by rename, a new inode');
    assert.ok(readFileSync(cached).equals(bytes), 'the kit\'s bytes');
    assert.equal(fire(r, FIND).code, 2);
  } finally { stopDaemon(r); }
});

test('installing the binary is by copy then rename in the same folder, never in place, and keeps the folder at mode 700', { skip }, () => {
  const r = rig(false);
  const dest = cachedBinary(r.env, target ?? 'darwin-arm64');
  assert.equal(installBinary(KIT, r.env).kind, 'installed');
  const first = statSync(dest).ino;
  assert.equal(installBinary(KIT, r.env).kind, 'same');
  writeFileSync(dest, 'old');
  assert.equal(installBinary(KIT, r.env).kind, 'installed');
  assert.notEqual(statSync(dest).ino, first);
  assert.equal(statSync(r.cache).mode & 0o777, 0o700);
  assert.deepEqual(installBinary(KIT, r.env, 'win32', 'x64'), { kind: 'none', why: 'no client is built for win32-x64' });
});
