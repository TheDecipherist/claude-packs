// dup.mjs: the repo-wide copy count doctor holds to a ratchet (once-only's jscpd).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { repoClones } from '../../../packs/base/hooks/lib/dup.mjs';

const IMPORTS = ['glob', 'layout', 'project', 'writes', 'hook-log', 'selftest', 'json', 'files']
  .map((m) => `import { ${m.replace('-', '')}A, ${m.replace('-', '')}B } from './lib/${m}.mjs';\n`).join('');
const BODY = Array.from({ length: 12 }, (_, i) => `  total += values[${i}] * weights[${i}] + offsets[${i}];\n`).join('');

test('two modules that share only their imports are no copy (KWB-176)', () => {
  const dir = scratchDir('dup-');
  put(join(dir, 'a.mjs'), `${IMPORTS}export function one(x) {\n  return x + 1;\n}\n`);
  put(join(dir, 'b.mjs'), `${IMPORTS}export function two(y) {\n  const z = y * 2;\n  return z - 3;\n}\n`);
  assert.deepEqual(repoClones(dir).clones, []);
});

test('two modules that share a function body are still a copy', () => {
  const dir = scratchDir('dup-');
  put(join(dir, 'a.mjs'), `export function one(values, weights, offsets) {\n  let total = 0;\n${BODY}  return total;\n}\n`);
  put(join(dir, 'b.mjs'), `export function two(values, weights, offsets) {\n  let total = 0;\n${BODY}  return total;\n}\n`);
  assert.equal(repoClones(dir).clones.length, 1);
});
