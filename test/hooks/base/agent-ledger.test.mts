// agent-ledger: a spawn and a finish leave a line each in .claude/logs/agents.jsonl, and nothing is refused (U74).
import { readText } from '../../../packs/base/hooks/lib/files.mts';
import { rowsOf } from '../../../packs/base/hooks/agent-ledger.mts';
import { join } from 'node:path';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import { assert, hookRun, test } from '../../kit-cli.mts';

holdsTheContract({
  hook: 'agent-ledger.mjs',
  dir: () => fixture('base'),
  same: () => ({ payload: { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { model: 'sonnet', prompt: 'x' } }, status: 0 }),
});

test('agent-ledger: a scripted spawn and finish leave two lines', () => {
  const dir = fixture('base');
  assert.equal(hookRun(dir, 'agent-ledger.mjs', { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { model: 'haiku', description: 'Find', prompt: 'look up x' } }).status, 0);
  assert.equal(hookRun(dir, 'agent-ledger.mjs', { hook_event_name: 'SubagentStop', agent_id: 'a9', agent_type: 'Explore' }).status, 0);
  const rows = rowsOf(readText(join(dir, '.claude/logs/agents.jsonl')) ?? '');
  assert.deepEqual(rows.map((r) => r['event']), ['spawn', 'finish']);
  assert.equal(rows[0]?.['model'], 'haiku');
  assert.equal(rows[1]?.['agent'], 'a9');
});
