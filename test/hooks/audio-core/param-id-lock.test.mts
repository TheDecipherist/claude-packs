// param-id-lock: a parameter id once seen is never lost (PostToolUse). The contract, then the refusals of the old root files.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { parseJson, readJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { withLayout, write } from '../../fixtures/installs.mts';
import { cli, hookRun, spawnSync, test } from '../../kit-cli.mts';
import { logLines, runner, workProject } from '../work-project.mts';
import { fireAs } from '../../worktree-rig.mts';
import type { Checkouts } from '../../worktree-rig.mts';
import { fixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';
import { routeProject, unrefused } from '../routes.mts';

const PARAMS = (...ids: string[]): string => `${ids.map((id) => `auto p_${id} = juce::ParameterID { "${id}", 1 };`).join('\n')}\n`;
const PARAMS_H = 'src/params/Params.h';

// An audio-core install whose Params.h holds two ids and whose lock was started from them (what a project does with --init).
function withLock(): string {
  const dir = fixture('audio-core');
  put(join(dir, PARAMS_H), PARAMS('cutoff', 'res'));
  spawnSync('node', [join(dir, '.claude/hooks/param-id-lock.mjs'), '--init'], { cwd: dir, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: 'ignore' });
  return dir;
}

async function worktreeCase(checkouts: Checkouts): Promise<void> {
  await installedWorktreeCase(checkouts, 'param-id-lock.mjs');
  const { here, wt } = checkouts;
  // PostToolUse: the edit is already on disk. A worktree that drops an id is refused even though main still has it; a worktree's
  // new id goes into the worktree's lock, never main's.
  const post = (file: string): number | null => fireAs(here, 'param-id-lock.mjs', write(file)).status;
  put(join(wt, PARAMS_H), PARAMS('cutoff'));
  assert.equal(post(join(wt, PARAMS_H)), 2);
  put(join(wt, PARAMS_H), PARAMS('cutoff', 'res', 'drive'));
  assert.equal(post(join(wt, PARAMS_H)), 0);
  const lockOf = (root: string): string[] => parseJson<string[]>(readFileSync(join(root, '.claude/param-ids.lock.json'), 'utf8')) ?? [];
  assert.ok(lockOf(wt).includes('drive'));
  assert.ok(!lockOf(here).includes('drive'));
  // Main drops an id the worktree still has: the worktree's copy must not hide it.
  put(join(here, PARAMS_H), PARAMS('cutoff'));
  assert.equal(post(join(here, PARAMS_H)), 2);
  put(join(here, PARAMS_H), PARAMS('cutoff', 'res'));
}

holdsTheContract({
  hook: 'param-id-lock.mjs',
  dir: withLock,
  worktree: worktreeCase,
  same: (project) => {
    put(join(project, PARAMS_H), PARAMS('cutoff'));
    return { payload: write(join(project, PARAMS_H)), status: 2 };
  },
});

// PostToolUse: the write has landed; every route that wrote an id file away is refused.
test('param-id-lock refuses a lost parameter id by every route', () => {
  const dir = routeProject();
  put(join(dir, PARAMS_H), PARAMS('cutoff', 'res'));
  spawnSync('node', [join(dir, '.claude/hooks/param-id-lock.mjs'), '--init'], { cwd: dir, env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, stdio: 'ignore' });
  const missed = unrefused(dir, 'param-id-lock.mjs', PARAMS_H, `${PARAMS('cutoff')}PLACEHOLDER\n`, '// res gone', {
    before: (target, landed) => put(target, landed), // the write already happened
  });
  assert.deepEqual(missed, []);
});

test('KF-18: a config regex param-id-lock cannot compile is reported by name, and is no crash', () => {
  const dir = workProject('audio-core');
  put(join(dir, '.claude/param-ids.config.json'), toJson({ patterns: ['(?m)^([a-z]+)$'] }));
  const file = join(dir, 'src/params/Ids.h');
  put(file, '// ids\n');
  const r = runner(dir, { hook_event_name: 'PostToolUse', session_id: 's1', cwd: dir, tool_name: 'Write', tool_input: { file_path: file, content: '// ids\n' } }, '.claude/hooks/param-id-lock.mjs');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /param-ids\.config\.json/);
  assert.match(r.stderr, /\(\?m\)/);
  assert.equal(logLines(dir, 'crashes.jsonl').length, 0);
});

const juceParam = (id: string): string => `auto p_${id} = juce::ParameterID { "${id}", 1 };\n`;
const paramWrite = (dir: string, rel: string, id: string) => {
  put(join(dir, rel), juceParam(id));
  return { hook_event_name: 'PostToolUse', cwd: dir, tool_name: 'Write', tool_input: { file_path: join(dir, rel), content: juceParam(id) } };
};
const lockIds = (dir: string): unknown => readJson(join(dir, '.claude/param-ids.lock.json'));

test('KF-15: param-id-lock protects from the first id it sees, with no --init', () => {
  const dir = workProject('audio-core');
  assert.equal(hookRun(dir, 'param-id-lock.mjs', paramWrite(dir, 'src/params/Ids.h', 'cutoff')).status, 0);
  assert.deepEqual(lockIds(dir), ['cutoff']);
  assert.equal(hookRun(dir, 'param-id-lock.mjs', paramWrite(dir, 'src/params/Ids.h', 'renamed')).status, 2);
});

test('KF-15: ids under the build output are not the unit\'s, whatever the folder is called', () => {
  const dir = workProject('audio-core');
  withLayout(dir, { buildOutput: ['elsewhere/**'] });
  for (const rel of ['elsewhere/_deps/juce/Param.h', 'out/_deps/juce/Param.h']) put(join(dir, rel), juceParam('juceProgramParameter'));
  assert.equal(hookRun(dir, 'param-id-lock.mjs', paramWrite(dir, 'src/params/Ids.h', 'cutoff')).status, 0);
  assert.deepEqual(lockIds(dir), ['cutoff']);
});

test('KF-15: doctor is red for a unit with parameters the lock cannot see', () => {
  const dir = workProject('audio-core');
  put(join(dir, 'src/params/Table.cpp'), 'for (auto& row : rows) layout.add (std::make_unique<juce::AudioParameterFloat> (row.id, row.name, row.range, row.init));\n');
  assert.match(cli(dir, 'doctor').stdout, /param-id-lock.*no ids/s);
  put(join(dir, '.claude/param-ids.lock.json'), '["cutoff"]\n');
  assert.doesNotMatch(cli(dir, 'doctor').stdout, /param-id-lock.*no ids/s);
});
