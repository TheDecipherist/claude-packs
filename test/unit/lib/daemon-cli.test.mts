// lib/daemon-cli.mts: `daemon status|stop` read the pid file of the project's resident runner (W8.2).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { daemonCommand, type DaemonHost } from '../../../lib/daemon-cli.mts';
import { alive } from '../../../packs/base/hooks/lib/daemon-find.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { real } from '../../../packs/base/hooks/lib/project.mts';
import { lockHash } from '../../../packs/base/hooks/lib/proxy-wire.mts';
import type { DaemonState } from '../../../packs/base/hooks/resident/state.mts';

const cache = (): string => mkdtempSync('/tmp/cp-');
const host = (folder: string): DaemonHost => ({ env: { CLAUDE_PACKS_CACHE: folder }, home: '/nowhere', platform: 'linux', uid: 0 });
const state = (project: string, pid: number, lock: string): DaemonState =>
  ({ pid, key: 'k', project, hooks: '/h', node: 'n', lockHash: lock, started: Date.now() - 120_000, lastEvent: 0, events: 7, workers: 4, rss: 90 * 1048576, heap: 20 * 1048576 });
async function say(dir: string, args: string[], folder: string): Promise<{ code: number; out: string }> {
  const lines: string[] = [];
  const code = await daemonCommand(dir, args, (l) => lines.push(l), host(folder));
  return { code, out: lines.join('\n') };
}

test('status: none says so; a live one shows pid, age, events, workers, memory; an old kit\'s says it is old', async () => {
  const dir = scratchDir('daemon-cli-');
  put(join(dir, '.claude/claude-packs.lock.json'), '{"kit":"now"}');
  const folder = cache();
  assert.deepEqual(await say(dir, ['status'], folder), { code: 0, out: `no resident runner for ${real(dir)}` });
  put(join(folder, 'k.pid'), toJson(state(real(dir), process.pid, lockHash('{"kit":"now"}'))));
  put(join(folder, 'o.pid'), toJson(state(real(dir), process.pid, 'oldhash')));
  put(join(folder, 'x.pid'), toJson(state('/another/project', process.pid, 'x')));
  const out = (await say(dir, ['status'], folder)).out;
  assert.match(out, new RegExp(`running  pid ${process.pid}  up 2 min  events 7  workers 4  rss 90 MB`));
  assert.equal(out.match(/running/g)?.length, 2, 'the other project\'s is not listed');
  assert.match(out, /an old kit's and ends when idle/);
});

test('stop: ends the live one and removes its pid file; a dead one\'s file is removed; unknown words are an error', async () => {
  const dir = scratchDir('daemon-cli-');
  const folder = cache();
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  const pid = child.pid ?? 0;
  put(join(folder, 'a.pid'), toJson(state(real(dir), pid, 'h')));
  put(join(folder, 'b.pid'), toJson(state(real(dir), 2147483646, 'h')));
  const stopped = await say(dir, ['stop'], folder);
  assert.equal(stopped.code, 0);
  assert.match(stopped.out, new RegExp(`stopped pid ${pid}`));
  assert.equal(existsSync(join(folder, 'a.pid')) || existsSync(join(folder, 'b.pid')), false);
  assert.equal((await say(dir, ['stop'], folder)).out, `no resident runner for ${real(dir)}`);
  await assert.rejects(say(dir, ['restart'], folder), /daemon status/);
});

test('alive: a process that exists is alive even when this user may not signal it (pid 1: EPERM), a gone one is not', () => {
  assert.equal(alive(process.pid), true);
  assert.equal(alive(1), true);
  assert.equal(alive(2147483646), false);
});
