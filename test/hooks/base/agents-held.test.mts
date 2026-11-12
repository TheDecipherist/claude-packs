// agents-held: a session with nobody there starts its agents in the foreground. The hook's contract (its selftest, its worktree
// case, the emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { COMMAND_CASES } from '../../worktree-cases-commands.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { fileURLToPath } from 'node:url';
import { pendingAgents } from '../../../packs/base/hooks/lib/background-agents.mts';

const FIXTURE = fileURLToPath(new URL('../../fixtures/transcripts/background-agents.jsonl', import.meta.url));
const WORKTREE = COMMAND_CASES['agents-held.mjs'];
if (!WORKTREE) throw new Error('agents-held has no worktree case');

holdsTheContract({
  hook: 'agents-held.mjs',
  dir: () => fixture('base'),
  same: () => ({
    payload: { hook_event_name: 'Stop', transcript_path: FIXTURE },
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

// KWB-199: a background agent may run while the turn is open; the end of the turn is refused while one has not returned.
test('the sample transcript: the foreground agent and the returned one do not count, the unreturned one does (KWB-199)', () => {
  const pending = pendingAgents(readFileSync(FIXTURE, 'utf8'));
  assert.deepEqual(pending, [{ id: 'toolu_wait', description: 'Item three' }]);
});

test('a refused launch (an error result) is not pending, and a torn last line is skipped (KWB-199)', () => {
  const launch = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'x1', name: 'Agent', input: { description: 'd', run_in_background: true } }] } });
  const refused = JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'x1', is_error: true, content: 'BLOCKED' }] } });
  assert.deepEqual(pendingAgents(`${launch}\n${refused}\n{"type":"assi`), []);
  assert.equal(pendingAgents(`${launch}\n{"type":"assi`).length, 1);
});

for (const file of ['packs/base/rules/agents-held.md', 'packs/base/skills/run-a-workorder/SKILL.md']) {
  test(`${file} allows a background wave with the turn kept open (KWB-199)`, () => {
    const text = readFileSync(file, 'utf8').replace(/\s+/g, ' ');
    assert.match(text, /merg\w+ and refill\w* (?:a|each) slot/);
    assert.match(text, /never end(?:ing)? a turn with an agent running/i);
    assert.match(text, /foreground agent hides the notifications/);
    assert.match(text, /build\/evidence\/KWB-199/);
  });
}
