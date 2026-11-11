// 0.9.2: brief-guard's refusal counter (.claude/usage.log) is a local log: an install ignores it, so a step's save never stops on it.
// 0.9.12: the hooks' timing log (.claude/hooks.log, KWB-24) is local too.
import { assert, join, readFileSync, test } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';

test('an install ignores .claude/usage.log and .claude/hooks.log', () => {
  const dir = fixture('audio-core');
  const lines = readFileSync(join(dir, '.gitignore'), 'utf8').split('\n');
  for (const f of ['.claude/usage.log', '.claude/hooks.log']) assert.ok(lines.includes(f), f);
});
