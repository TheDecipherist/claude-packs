// heartbeat: every tool call is the agent's heartbeat, written where the status reads it. The hook's contract (its selftest, its
// worktree case, the emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { readJson } from '../../../packs/base/hooks/lib/json.mts';
import { assert } from '../../kit-cli.mts';
import { fireAs } from '../../worktree-rig.mts';
import { fixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';

interface Beat { tool?: unknown; event?: unknown }

// 1.8.0: a call in the worktree is that agent's heartbeat, written in the main checkout where the status reads it, never into the
// worktree; a call in the main checkout is the lead's.
async function worktree(checkouts: Checkouts): Promise<void> {
  await installedWorktreeCase(checkouts, 'heartbeat.mjs');
  const { here, wt } = checkouts;
  const beatFile = (root: string, who: string): string => join(root, '.claude/logs/heartbeats', `${who}.json`);
  const calls = [
    { who: 'agent-x', event: { hook_event_name: 'PreToolUse', cwd: wt, tool_name: 'Edit', tool_input: { file_path: join(wt, 'src/x.cpp') } } },
    { who: 'lead', event: { hook_event_name: 'PostToolUse', cwd: here, tool_name: 'Read', tool_input: { file_path: join(here, 'CLAUDE.md') } } },
  ];
  for (const { who, event } of calls) assert.equal(fireAs(here, 'heartbeat.mjs', event).status, 0, who);
  assert.equal(readJson<Beat>(beatFile(here, 'agent-x'))?.tool, 'Edit', 'the worktree call beats in the main checkout');
  assert.equal(readJson<Beat>(beatFile(wt, 'agent-x')), null, 'and never in the worktree');
  assert.equal(readJson<Beat>(beatFile(here, 'lead'))?.event, 'post');
}

holdsTheContract({
  hook: 'heartbeat.mjs',
  dir: () => fixture('base'),
  same: (project) => ({ payload: { hook_event_name: 'PreToolUse', cwd: project, tool_name: 'Edit', tool_input: { file_path: join(project, 'src/x.cpp') } }, status: 0 }),
  worktree,
});
