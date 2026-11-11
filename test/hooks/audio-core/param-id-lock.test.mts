// param-id-lock: a parameter id once seen is never lost (PostToolUse). The contract, then the refusals of the old root files.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { parseJson } from '../../../packs/base/hooks/lib/json.mts';
import { write } from '../../fixtures/installs.mts';
import { spawnSync } from '../../kit-cli.mts';
import { fireAs } from '../../worktree-rig.mts';
import type { Checkouts } from '../../worktree-rig.mts';
import { fixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';

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
