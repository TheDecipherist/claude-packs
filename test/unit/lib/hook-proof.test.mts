// lib/hook-proof.mts: a hook no settings entry runs is named, and a project with no hooks folder has no problem.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { hookProofProblems, statusProblems } from '../../../lib/hook-proof.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';

test('a project with no hooks folder has no problem', async () => {
  const dir = scratchDir('proof-none-');
  assert.deepEqual(await hookProofProblems(dir, '{}'), []);
  assert.deepEqual(statusProblems(dir), []);
});

test('a hook file that no settings entry runs is named; one that is run is not (planted)', async () => {
  const dir = scratchDir('proof-unrun-');
  put(join(dir, '.claude/hooks/run-guard.mjs'), '');
  put(join(dir, '.claude/hooks/loose.mjs'), '');
  put(join(dir, '.claude/hooks/run-hooks.mjs'), '');
  const problems = await hookProofProblems(dir, '{"command":"node .claude/hooks/run-guard.mjs"}');
  assert.deepEqual(problems, ['loose.mjs is in .claude/hooks but no settings entry runs it, so it refuses nothing']);
});

test('statusProblems reports what a hook\'s --status says when it exits non-zero', () => {
  const dir = scratchDir('proof-status-');
  put(join(dir, '.claude/hooks/param-id-lock.mjs'), 'console.log("no ids held"); process.exit(1);\n');
  assert.deepEqual(statusProblems(dir), ['no ids held']);
  put(join(dir, '.claude/hooks/param-id-lock.mjs'), 'process.exit(0);\n');
  assert.deepEqual(statusProblems(dir), []);
});
