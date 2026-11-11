// stage-guard: `git add -A` and its kin are refused; staging a named file is not. The hook's contract, then the refusals that sat in the
// old root test files.
import { join } from 'node:path';
import { bash } from '../../fixtures/installs.mts';
import { assert, existsSync, hookRun, readFileSync, test } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'stage-guard.mjs',
  dir: () => fixture('synth-creator'),
  same: (project) => ({ payload: bash('git add -A', project), status: 2 }),
});

test('stage-guard is on by default and off in the Stellix profile', () => {
  const plain = fixture('audio-core');
  assert.equal(hookRun(plain, 'stage-guard.mjs', { tool_name: 'Bash', tool_input: { command: 'git add -A' } }).status, 2);
  const stellix = fixture('stellix-profile');
  assert.ok(!existsSync(join(stellix, '.claude/hooks/stage-guard.mjs')));
  assert.match(readFileSync(join(stellix, '.claude/rules/skill-writing.md'), 'utf8'), /\.claude\/skills/);
});
