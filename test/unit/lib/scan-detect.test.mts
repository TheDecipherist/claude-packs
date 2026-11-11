// lib/scan-detect.mts: the configuration and the packs a project's files and dependencies recommend.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { recommend } from '../../../lib/scan-detect.mts';

test('a package.json dependency recommends its pack, with what was found; a package.json that does not parse says nothing', () => {
  const dir = scratchDir('detect-');
  put(join(dir, 'package.json'), JSON.stringify({ dependencies: { mongodb: '7', fastify: '5' } }));
  put(join(dir, 'broken/package.json'), '{ not json');
  const r = recommend(dir, ['package.json', 'broken/package.json', 'src/a.ts']);
  assert.equal(r.config, 'node');
  assert.equal(r.early, false);
  assert.ok(r.packs.some((p) => p.pack === 'mongo' && p.why === 'dependency: mongodb'));
  assert.ok(r.packs.some((p) => p.pack === 'fastify'));
  assert.ok(r.leftOut.includes('tui'));
  assert.equal(r.fullStack, false);
});

test('a layout.json that names a configuration decides it; one naming an unknown configuration is read from the files', () => {
  const dir = scratchDir('detect-');
  put(join(dir, '.claude/layout.json'), JSON.stringify({ folders: {}, concepts: {}, configuration: 'python' }));
  const named = recommend(dir, ['src/a.ts']);
  assert.deepEqual([named.config, named.why], ['python', 'named in its layout.json']);
  put(join(dir, '.claude/layout.json'), JSON.stringify({ folders: {}, concepts: {}, configuration: 'nonesuch' }));
  assert.equal(recommend(dir, ['src/a.ts']).config, 'node');
});

test('a project with no code is early, and only its notes recommend a pack; with code the notes add nothing', () => {
  const dir = scratchDir('detect-');
  put(join(dir, 'README.md'), 'A JUCE plugin with MIDI input.\n');
  const early = recommend(dir, ['README.md']);
  assert.equal(early.early, true);
  assert.deepEqual([early.config, early.why], ['synth-creator', 'named in the notes']);
  const coded = recommend(dir, ['README.md', 'src/a.py']);
  assert.equal(coded.early, false);
  assert.equal(coded.config, 'python');
  assert.ok(!coded.packs.some((p) => p.why === 'named in the notes'));
});

test('files of the kit and of installed dependencies are not the project; a project with nothing is base', () => {
  const dir = scratchDir('detect-');
  const r = recommend(dir, ['.claude/hooks/a.mjs', 'node_modules/x/index.js']);
  assert.deepEqual([r.config, r.why], ['base', 'no stack the kit has a configuration for']);
});
