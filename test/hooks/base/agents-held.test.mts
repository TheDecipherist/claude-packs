// agents-held: a session with nobody there starts its agents in the foreground. The hook's contract (its selftest, its worktree
// case, the emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { COMMAND_CASES } from '../../worktree-cases-commands.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const WORKTREE = COMMAND_CASES['agents-held.mjs'];
if (!WORKTREE) throw new Error('agents-held has no worktree case');

holdsTheContract({
  hook: 'agents-held.mjs',
  dir: () => fixture('base'),
  same: () => ({
    payload: { tool_name: 'Agent', tool_input: { prompt: 'x', run_in_background: true } },
    env: { CLAUDE_PACKS_UNATTENDED: '1' },
    status: 2,
  }),
  worktree: WORKTREE,
});

// KWB-199: a wave returns when its slowest agent does, so the rule and the skill tell a lead to size the agents alike.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

for (const file of ['packs/base/rules/agents-held.md', 'packs/base/skills/run-a-workorder/SKILL.md']) {
  test(`${file} says to split a wave into agents of similar size (KWB-199)`, () => {
    const text = readFileSync(file, 'utf8').replace(/\s+/g, ' ');
    assert.match(text, /agents of similar size/);
    assert.match(text, /long list to several agents, not one/);
  });
}
