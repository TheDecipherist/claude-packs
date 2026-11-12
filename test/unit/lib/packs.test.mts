// lib/packs.mjs: what the installer copies (W2.3, d-2): never a TypeScript source, a source map or the build's memory.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRESETS, availablePacks, isDisabled, kitHookScripts, normalisePacks, planFiles, readPack, registerPack } from '../../../lib/packs.mjs';
import { notInstalled, put, scratchDir, walk } from '../../../packs/base/hooks/lib/files.mts';
import { fixture } from '../../fixtures/installs.mts';

const KIT = fileURLToPath(new URL('../../../', import.meta.url));

test('base holds .mts sources, and its install plan copies none of them, only their emitted .mjs (W2.3)', () => {
  const sources = walk(join(KIT, 'packs/base'), () => false).filter((f) => f.endsWith('.mts'));
  assert.ok(sources.length > 0, 'base has TypeScript sources: the plant is the real tree');
  const planned = planFiles('base', {}).map((p) => p.rel ?? '');
  assert.deepEqual(planned.filter((rel) => /\.(?:mts|cts|map|tsbuildinfo)$/.test(rel)), []);
  for (const src of sources) {
    const emitted = src.replace(/\.mts$/, '.mjs');
    if (existsSync(emitted) && !src.endsWith('.d.mts')) assert.ok(planned.some((rel) => emitted.endsWith(rel.replace(/^\.claude\//, ''))), emitted);
  }
});

test('the walk the installer uses skips build-only files and junk; the default walk keeps a .mts', () => {
  const dir = scratchDir('packs-walk-');
  for (const f of ['a.mjs', 'a.mts', 'types.d.mts', 'a.mjs.map', 'b.tsbuildinfo', '__pycache__/x.pyc', 'c.pyc']) put(join(dir, f), 'x');
  const names = (files: string[]) => files.map((f) => f.slice(dir.length + 1));
  assert.deepEqual(names(walk(dir, notInstalled)), ['a.mjs']);
  assert.deepEqual(names(walk(dir)), ['a.mjs', 'a.mjs.map', 'a.mts', 'b.tsbuildinfo', 'types.d.mts']);
});

test('readPack names an unknown pack and a pack.json that is not JSON; a custom pack\'s hooks are opt-in', () => {
  assert.throws(() => readPack('no-such-pack'), /unknown pack "no-such-pack" \(available: [a-z]/);
  const dir = scratchDir('packs-custom-');
  put(join(dir, 'pack.json'), '{ nope');
  registerPack('custom-bad', dir);
  assert.throws(() => readPack('custom-bad'), /is not valid JSON/);
  put(join(dir, 'pack.json'), '{"name":"custom-ok","optIn":["hooks/own.mjs"]}');
  put(join(dir, 'hooks/h.mjs'), '');
  put(join(dir, 'hooks/h.mts'), '');
  registerPack('custom-ok', dir);
  assert.deepEqual(readPack('custom-ok').optIn, ['hooks/own.mjs', 'hooks/h.mjs']);
  assert.ok(availablePacks().includes('custom-ok'));
});

test('normalisePacks puts base first, expands a preset, drops duplicates and refuses an unknown name', () => {
  assert.deepEqual(normalisePacks(['node-lib', 'js-ts', 'base']), ['base', ...(PRESETS['node-lib'] ?? [])]);
  assert.throws(() => normalisePacks(['nope']), /unknown pack/);
});

test('a pack whose requirement is absent is refused with the requirement named (W4: sound-design requires audio-core)', () => {
  assert.deepEqual(readPack('sound-design').requires, ['audio-core']);
  assert.throws(() => normalisePacks(['sound-design']), /sound-design requires audio-core/);
  assert.throws(() => normalisePacks(['cpp', 'sound-design']), /sound-design requires audio-core/);
  assert.deepEqual(normalisePacks(['audio-core', 'sound-design']), ['base', 'audio-core', 'sound-design']);
  assert.deepEqual(normalisePacks(['sound-design', 'audio-core']), ['base', 'sound-design', 'audio-core']);   // a requirement may come after
});

test('`init sound-design` alone refuses, naming audio-core, and writes nothing (W4 Done when)', () => {
  const dir = scratchDir('cp-requires-');
  const alone = spawnSync(process.execPath, [join(KIT, 'bin/claude-packs.mjs'), 'init', 'sound-design', '--dir', dir], { encoding: 'utf8' });
  assert.notEqual(alone.status, 0);
  assert.match(alone.stdout + alone.stderr, /sound-design requires audio-core/);
  assert.equal(existsSync(join(dir, '.claude')), false, 'nothing was installed');
  // with its requirement there, the same pack goes in: an audio-core install (a fixture copy) takes it (KWB-199: no init here)
  const withAudio = fixture('audio-core');
  const both = spawnSync(process.execPath, [join(KIT, 'bin/claude-packs.mjs'), 'add', 'sound-design', '--dir', withAudio], { encoding: 'utf8' });
  assert.equal(both.status, 0, both.stdout + both.stderr);
});

test('isDisabled matches a file, a folder and a folder with a trailing slash, not a name that merely starts alike', () => {
  const layout = { disable: ['hooks/x.mjs', 'skills/gpu/'] };
  assert.equal(isDisabled(layout, 'hooks/x.mjs'), true);
  assert.equal(isDisabled(layout, 'skills\\gpu\\SKILL.md'), true);
  assert.equal(isDisabled(layout, 'hooks/x.mjs.bak'), false);
  assert.equal(isDisabled({}, 'hooks/x.mjs'), false);
});

test('kitHookScripts lists the emitted hook files of every pack', () => {
  assert.ok(kitHookScripts().has('no-find.mjs'));
});
