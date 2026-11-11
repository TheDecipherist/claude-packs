// KF-31: a rule's own test is pointed at by `ruleTests`, or declined with a stated reason (split from rule-tests.test.mts so no file sums over a minute).
import { assert, join, test } from '../kit-cli.mts';
import { withLayout } from '../fixtures/installs.mts';
import { put } from '../../packs/base/hooks/lib/files.mts';
import { RULE, says, unit } from './rule-tests-rig.mts';

test('ruleTests points a rule at its test, and a pointer to nothing is red', () => {
  const dir = unit();
  withLayout(dir, { ruleTests: { [RULE]: 'gates/prepare.sh' } });
  assert.match(says(dir), new RegExp(`${RULE}: ruleTests names gates/prepare\\.sh, which does not exist`));
  put(join(dir, 'gates/prepare.sh'), 'exit 0\n');
  assert.doesNotMatch(says(dir), new RegExp(`answers to:[^\\n]*${RULE}`));
});

test('a rule may be declined only with a stated reason', () => {
  const dir = unit();
  withLayout(dir, { ruleTests: { [RULE]: 'none: the unit has no prepare, it is a command-line tool' } });
  assert.doesNotMatch(says(dir), new RegExp(`answers to:[^\\n]*${RULE}`));
  withLayout(dir, { ruleTests: { [RULE]: 'none' } });
  assert.match(says(dir), new RegExp(`answers to:[^\\n]*${RULE}`));
});
