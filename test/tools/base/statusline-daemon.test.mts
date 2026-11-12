// packs/base/tools/statusline-daemon.mts: the bar asks the daemon's socket with a 50 ms deadline, never starts one, and says
// `hooks: slow path` when none serves the hooks (W8.4, review-2-go 7.1). The idle clock is the daemon's own selftest's (selftest-status).
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { lockHash } from '../../../packs/base/hooks/lib/proxy-wire.mts';
import { RESIDENT, makeRig, stopAll, waitFor, type Rig } from '../../../packs/base/hooks/resident/selftest-rig.mts';
import { PLANTS } from '../../../packs/base/hooks/resident/selftest-plants.mts';
import { SLOW_PATH, residentState } from '../../../packs/base/tools/statusline-daemon.mts';
import { statusBar } from '../../../packs/base/tools/statusline.mts';
import { assert, fresh, test } from '../../kit-cli.mts';

const envOf = (rig: Rig): Record<string, string | undefined> => ({ HOME: rig.dir, PATH: process.env.PATH, CLAUDE_PACKS_CACHE: rig.cache });
const withPicker = (rig: Rig): Rig => { put(join(rig.dir, '.claude/hooks/bin/hook-proxy'), '#!/bin/sh\n'); return rig; };
const pids = (rig: Rig): string[] => readdirSync(rig.cache).filter((f) => f.endsWith('.pid'));

test('no proxy in the project, or the daemon switched off: nothing to say', async () => {
  const rig = makeRig(PLANTS.filter((p) => p.name === 'quick'));
  try {
    assert.equal(await residentState(rig.dir, envOf(rig)), 'unused');
    withPicker(rig);
    assert.equal(await residentState(rig.dir, { ...envOf(rig), CLAUDE_PACKS_DAEMON: 'off' }), 'unused');
    assert.equal(await residentState(undefined, envOf(rig)), 'unused');
  } finally { await stopAll(rig); }
});

test('no daemon: the bar says `down` and starts none; the marker is drawn only then', async () => {
  const rig = withPicker(makeRig(PLANTS.filter((p) => p.name === 'quick')));
  try {
    assert.equal(await residentState(rig.dir, envOf(rig)), 'down');
    assert.deepEqual(pids(rig), [], 'asking started no daemon');
    const draw = (resident: 'up' | 'down' | 'unused'): string => statusBar('{"model":{"display_name":"Opus"}}', { env: { NO_COLOR: '1', HOME: rig.dir }, refresh: false, resident, git: () => ({}) }).join('\n');
    assert.match(draw('down'), new RegExp(SLOW_PATH));
    assert.doesNotMatch(draw('up'), new RegExp(SLOW_PATH));
    assert.doesNotMatch(draw('unused'), new RegExp(SLOW_PATH));
  } finally { await stopAll(rig); }
});

test('a live daemon of the lock\'s kit answers the ask: `up`; one that never answers is `down` by the 50 ms deadline', async () => {
  const rig = withPicker(makeRig(PLANTS.filter((p) => p.name === 'quick')));
  try {
    const child = spawn(process.execPath, [RESIDENT, '--serve', rig.dir, '--hooks', rig.hooks, '--pool', '1'], { cwd: '/', stdio: 'ignore', detached: true, env: envOf(rig) });
    child.unref();
    rig.pids.add(child.pid ?? 0);
    assert.ok(await waitFor(() => pids(rig).length === 1), 'the daemon is up');
    assert.equal(await residentState(rig.dir, envOf(rig)), 'up');
  } finally { await stopAll(rig); }
  // a daemon that accepts and says nothing (hung): the bar waits 50 ms, not the hook deadline
  const hung = withPicker(makeRig(PLANTS.filter((p) => p.name === 'quick')));
  const server = createServer(() => undefined);
  const sleeper = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });   // a live pid for the pid file; stopAll ends it
  try {
    const lock = lockHash(toJson({ kit: 'selftest', packs: [], files: {} }));
    put(join(hung.cache, 'h.pid'), toJson({ pid: sleeper.pid ?? 0, key: 'h', project: hung.dir, hooks: '/h', node: 'n', lockHash: lock, started: Date.now(), lastEvent: 0, events: 0, workers: 1, rss: 1, heap: 1 }));
    await new Promise<void>((ok) => { server.listen(join(hung.cache, 'h.sock'), ok); });
    const began = Date.now();
    assert.equal(await residentState(hung.dir, envOf(hung)), 'down');
    assert.ok(Date.now() - began < 400, `waited ${Date.now() - began} ms for a daemon that never answers`);
  } finally { server.close(); await stopAll(hung); }
});

test('the bar renders in under 80 ms in process with the marker when no daemon runs', () => {
  const home = fresh('statusline-ms-');
  const times: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    const began = performance.now();
    statusBar('{"model":{"display_name":"Opus"}}', { env: { NO_COLOR: '1', HOME: home }, refresh: false, resident: 'down', git: () => ({ branch: 'b' }) });
    times.push(performance.now() - began);
  }
  assert.ok(Math.min(...times) < 80, `render ${times.map((t) => Math.round(t)).join(', ')} ms`);
});
