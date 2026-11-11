// planner W2: `workorder check <name>`, the rest of its refusals and its readings of an order (split from workorder-check.test.mts so no
// file sums over a minute).
import { assert, test } from '../kit-cli.mts';
import { CLEAN, check, holdsRefusals } from './workorder-check-rig.mts';

holdsRefusals(['a skill the project has not installed', 'a planner skill, which a run cannot use']);

test('a placeholder inside a code fence, and the constraints tags, are not placeholders', () => {
  const { status, out } = check('fenced', CLEAN.replace('packs: base', 'packs: base\n# <not a placeholder>') + '\n<constraints>\nAlways do:\n- x\n</constraints>\n');
  assert.equal(status, 0, out);
});

test('a Done when written as a list under its line is read whole', () => {
  const listed = CLEAN.replace('**Done when:** test/invoice.test.mjs passes.', '**Done when:**\n- the invoices total;\n- 12 of 12 sample invoices print.');
  const { status, out } = check('listed', listed);
  assert.equal(status, 0, out);
  const unmeasured = check('listed-bare', listed.replace('12 of 12 sample invoices print', 'the sample invoices print'));
  assert.equal(unmeasured.status, 1, unmeasured.out);
});
