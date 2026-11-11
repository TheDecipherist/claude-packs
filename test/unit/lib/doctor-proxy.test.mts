// doctor and the proxy binary (W8.2): which path is live is said, and the binary's selftest is run like a hook's.
import assert from 'node:assert/strict';
import { chmodSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { proxyProblems } from '../../../lib/doctor-proxy.mts';
import { cachedBinary, hostTarget } from '../../../lib/proxy-binary.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

const target = hostTarget();

function rig(binary: string | null): { project: string; env: Record<string, string>; said: string[]; log: (l: string) => void } {
  const dir = scratchDir('doctor-proxy-');
  const project = join(dir, 'project');
  put(join(project, '.claude', 'hooks', 'bin', 'hook-proxy'), '#!/bin/sh\n');
  const env = { CLAUDE_PACKS_CACHE: join(dir, 'cache'), CLAUDE_PACKS_SELFTEST_CACHE: join(dir, 'proved'), PATH: process.env.PATH ?? '' };
  if (binary !== null && target !== null) {
    const file = cachedBinary(env, target);
    put(file, binary);
    chmodSync(file, 0o755);
  }
  const said: string[] = [];
  return { project, env, said, log: (l) => said.push(l) };
}

test('no binary in the cache: the TypeScript runner is said to be the live path, and nothing is red', () => {
  const r = rig(null);
  assert.deepEqual(proxyProblems(r.project, r.env, r.log), []);
  assert.match(r.said.join('\n'), /hook path: the TypeScript runner/);
});

test('a binary whose selftest fails is a problem (planted: exit 1), one that passes names the proxy and is remembered', { skip: target === null }, () => {
  const bad = rig('#!/bin/sh\necho planted fault\nexit 1\n');
  assert.match(proxyProblems(bad.project, bad.env, bad.log).join('\n'), /hook-proxy fails its selftest[\s\S]*planted fault/);
  const good = rig('#!/bin/sh\nexit 0\n');
  assert.deepEqual(proxyProblems(good.project, good.env, good.log), []);
  assert.match(good.said.join('\n'), /hook path: the proxy/);
  assert.deepEqual(proxyProblems(good.project, good.env, good.log), []);
  assert.match(good.said.join('\n'), /unchanged, not run again/);
});

test('a project with no picker says nothing', () => {
  const r = rig(null);
  assert.deepEqual(proxyProblems(join(r.project, 'elsewhere'), r.env, r.log), []);
  assert.deepEqual(r.said, []);
});
