// agent-model: an agent names its model, and Opus names a listed reason (U73). An opt-in hook: its fixture enables it.
import { enabledFixture, holdsTheContract } from '../hook-rig.mts';
import { assert, hookRun, test } from '../../kit-cli.mts';
import { withLayout } from '../../fixtures/installs.mts';

const dir = (): string => enabledFixture('agent-model', 'base', 'hooks/agent-model.mjs');
const spawn = (input: Record<string, unknown>): Record<string, unknown> => ({ hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { description: 'd', prompt: 'work', ...input } });

holdsTheContract({ hook: 'agent-model.mjs', dir, same: () => ({ payload: spawn({}), status: 2 }) });

test('agent-model: refuses no model and Opus with no reason, passes sonnet and a fork', () => {
  const project = dir();
  const status = (input: Record<string, unknown>): number | null => hookRun(project, 'agent-model.mjs', spawn(input)).status;
  assert.equal(status({}), 2);
  assert.equal(status({ model: 'opus' }), 2);
  assert.equal(status({ model: 'sonnet' }), 0);
  assert.equal(status({ subagent_type: 'fork' }), 0);
  assert.equal(status({ model: 'opus', prompt: 'x\nOPUS BECAUSE: hard debugging of a race' }), 0);
});

test('agent-model: the project\'s list of reasons replaces the default', () => {
  const project = dir();
  withLayout(project, () => ({ guards: { agentModel: { opusReasons: ['audit of a release'] } } }));
  const r = hookRun(project, 'agent-model.mjs', spawn({ model: 'opus', prompt: 'OPUS BECAUSE: hard debugging' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /audit of a release/);
});
