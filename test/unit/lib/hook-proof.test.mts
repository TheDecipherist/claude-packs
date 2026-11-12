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

test('a hook the runner\'s table has a row for is run; a row with no hook file, and a hook with no row and no entry, are named (W8.1)', async () => {
  const dir = scratchDir('proof-table-');
  put(join(dir, '.claude/hooks/in-table.mjs'), '');
  put(join(dir, '.claude/hooks/loose.mjs'), '');
  put(join(dir, '.claude/hooks/hooks.json'), JSON.stringify([{ hook: 'in-table', events: ['Stop'], role: 'judge' }, { hook: 'gone', events: ['Stop'], role: 'judge' }]));
  assert.deepEqual(await hookProofProblems(dir, '{"command":"node \\"$CLAUDE_PROJECT_DIR/.claude/hooks/run-hooks.mjs\\""}'), [
    'loose.mjs is in .claude/hooks but no settings entry runs it, so it refuses nothing',
    'hooks.json has a row for gone but .claude/hooks has no such hook, so the runner crashes on it',
  ]);
  // KWB-193: a table no settings entry starts runs nothing, so its rows register nothing (the Go proxy's picker starts it too)
  const noRunner = await hookProofProblems(dir, '{}');
  assert.ok(noRunner.includes('in-table.mjs is in .claude/hooks but no settings entry runs it, so it refuses nothing'), 'a row with no runner entry is no registration');
  assert.ok(!(await hookProofProblems(dir, '{"command":"sh \\"$CLAUDE_PROJECT_DIR/.claude/hooks/bin/hook-proxy\\" 60"}')).some((p) => p.startsWith('in-table.mjs')), 'the picker is a runner');
});

test('the resident runner is not a hook: no entry or row names it, and it is not a problem (W8.2)', async () => {
  const dir = scratchDir('proof-daemon-');
  put(join(dir, '.claude/hooks/resident.mjs'), '');
  assert.deepEqual(await hookProofProblems(dir, '{}'), []);
});

test('statusProblems reports what a hook\'s --status says when it exits non-zero', () => {
  const dir = scratchDir('proof-status-');
  put(join(dir, '.claude/hooks/param-id-lock.mjs'), 'console.log("no ids held"); process.exit(1);\n');
  assert.deepEqual(statusProblems(dir), ['no ids held']);
  put(join(dir, '.claude/hooks/param-id-lock.mjs'), 'process.exit(0);\n');
  assert.deepEqual(statusProblems(dir), []);
});
