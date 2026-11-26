// dup.mjs: the repo-wide copy count doctor holds to a ratchet (once-only's jscpd).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { repoClones, scan } from '../../../packs/base/hooks/lib/dup.mjs';

const IMPORTS = ['glob', 'layout', 'project', 'writes', 'hook-log', 'selftest', 'json', 'files']
  .map((m) => `import { ${m.replace('-', '')}A, ${m.replace('-', '')}B } from './lib/${m}.mjs';\n`).join('');
const BODY = Array.from({ length: 12 }, (_, i) => `  total += values[${i}] * weights[${i}] + offsets[${i}];\n`).join('');

test('two modules that share only their imports are no copy (KWB-176)', () => {
  const dir = scratchDir('dup-');
  put(join(dir, 'a.mjs'), `${IMPORTS}export function one(x) {\n  return x + 1;\n}\n`);
  put(join(dir, 'b.mjs'), `${IMPORTS}export function two(y) {\n  const z = y * 2;\n  return z - 3;\n}\n`);
  assert.deepEqual(repoClones(dir, { env: process.env }).clones, []);
});

test('two C++ headers that share only the toolkit\'s override declarations are no copy for the repo scan (KWB-245)', () => {
  const dir = scratchDir('dup-');
  const overrides = [
    '    void paint (juce::Graphics& g) override;',
    '    void mouseDown (const juce::MouseEvent& e) override;',
    '    void mouseDrag (const juce::MouseEvent& e) override;',
    '    void mouseUp (const juce::MouseEvent& e) override;',
    '    void mouseWheelMove (const juce::MouseEvent& e, const juce::MouseWheelDetails& wheel) override;',
  ].join('\n');
  const header = (name: string, member: string): string =>
    `#pragma once\nclass ${name} final : public juce::Component\n{\npublic:\n${overrides}\n\nprivate:\n    int ${member} = 0;\n};\n`;
  put(join(dir, 'Grid.h'), header('Grid', 'chosen'));
  put(join(dir, 'Curve.h'), header('Curve', 'held'));
  assert.deepEqual(repoClones(dir, { env: process.env }).clones, []);
});

test('two modules that share a function body are still a copy', () => {
  const dir = scratchDir('dup-');
  put(join(dir, 'a.mjs'), `export function one(values, weights, offsets) {\n  let total = 0;\n${BODY}  return total;\n}\n`);
  put(join(dir, 'b.mjs'), `export function two(values, weights, offsets) {\n  let total = 0;\n${BODY}  return total;\n}\n`);
  assert.equal(repoClones(dir, { env: process.env }).clones.length, 1);
});

test('a scan of given candidate files leaves out an emitted twin among them, as the whole-repo scan does (KWB-170, KWB-next)', () => {
  const dir = scratchDir('dup-twin-');
  const fn = (name: string): string => `export function ${name}(values, weights, offsets) {\n  let total = 0;\n${BODY}  return total;\n}\n`;
  put(join(dir, 'lib/a.mts'), fn('one'));
  put(join(dir, 'lib/a.mjs'), fn('one'));    // the build's output beside its source: no copy
  put(join(dir, 'lib/b.mjs'), fn('two'));    // a real copy
  const given = (paths: string[]): number => scan(dir, { env: process.env, paths }).clones.length;
  assert.equal(given([join(dir, 'lib/a.mjs'), join(dir, 'lib/b.mjs')]), 0, 'the twin is no candidate');
  assert.equal(given([join(dir, 'lib/a.mts'), join(dir, 'lib/b.mjs')]), 1, 'the source and a real copy still are');
});
