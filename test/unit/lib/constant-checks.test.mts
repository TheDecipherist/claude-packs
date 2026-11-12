// lib/constant-checks.mts: a check that depends only on the kit runs once per kit version and tool bytes (W8.4, d-9).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join } from 'node:path';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { constantKey, constantOnce, kitVersion } from '../../../lib/constant-checks.mts';
import { symmetryProblems } from '../../../lib/symmetry-doctor.mts';

test('a passed constant check is not run again; a change to its file, a failure and `fresh` are', () => {
  const dir = scratchDir('constant-');
  const tool = join(dir, 'tool.mjs');
  put(tool, 'export const a = 1;\n');
  const env = { CLAUDE_PACKS_SELFTEST_CACHE: join(dir, 'cache') };
  let runs = 0;
  const ok = (): string[] => { runs += 1; return []; };
  assert.deepEqual(constantOnce('t', tool, env, false, ok), []);
  assert.deepEqual(constantOnce('t', tool, env, false, ok), []);
  assert.equal(runs, 1, 'the second call is the cache\'s');
  constantOnce('t', tool, env, true, ok);
  assert.equal(runs, 2, '--fresh runs it');
  put(tool, 'export const a = 2;\n');
  constantOnce('t', tool, env, false, ok);
  assert.equal(runs, 3, 'new bytes, new key');
  assert.deepEqual(constantOnce('other', tool, env, false, () => ['broken']), ['broken']);
  assert.deepEqual(constantOnce('other', tool, env, false, () => ['broken']), ['broken'], 'a failure is never remembered');
});

test('the key names the kit version: another version is another key', () => {
  const dir = scratchDir('constant-');
  const tool = join(dir, 'tool.mjs');
  put(tool, 'export const a = 1;\n');
  assert.match(kitVersion(), /^\d+\.\d+\.\d+/);
  assert.notEqual(constantKey('a', tool), constantKey('b', tool));
});

test('doctor\'s shape-symmetry selftest is a constant check: a second doctor does not spawn it', () => {
  const dir = scratchDir('constant-');
  put(join(dir, '.claude/tools/shape-symmetry.mjs'), "if (process.argv.includes('--selftest')) { process.stderr.write('ran\\n'); process.exit(Number(process.env.EXIT ?? 0)); }\n");
  const env = { ...process.env, CLAUDE_PACKS_SELFTEST_CACHE: join(dir, 'cache') };
  assert.equal(symmetryProblems(dir, () => undefined, { ...env, EXIT: '1' }).length, 1);
  assert.deepEqual(symmetryProblems(dir, () => undefined, env), []);
  assert.deepEqual(symmetryProblems(dir, () => undefined, { ...env, EXIT: '1' }), [], 'a passed one is not run again, so a changed exit code is not heard');
  assert.equal(symmetryProblems(dir, () => undefined, { ...env, EXIT: '1' }, true).length, 1, 'doctor --fresh runs it');
});
