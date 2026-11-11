// planner W2: `workorder check <name>`, the pre-flight before a run. One planted fault per refusal, each refused with the line that
// names it; a clean order passes; an order with no install block is warned and still passes. (The rest: workorder-check-more.test.mts,
// split so no file sums over a minute.)
import { assert, cli, join, mkdirSync, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { CLEAN, check, holdsRefusals } from './workorder-check-rig.mts';

test('a clean order passes', () => {
  const { status, out } = check('clean', CLEAN);
  assert.equal(status, 0, out);
  assert.match(out, /workorder check clean: OK/);
  assert.doesNotMatch(out, /WARNING/);
});

holdsRefusals(['a placeholder left outside a code fence', 'a step with no Done when line', 'a Done when with no number and no path to a test']);

test('refused: doctor --strict red', () => {
  const dir = fixture('base');
  writeFileSync(join(dir, '.claude/settings.json'), '{}\n');
  mkdirSync(join(dir, 'docs/workorders/red'), { recursive: true });
  writeFileSync(join(dir, 'docs/workorders/red/workorder.md'), CLEAN);
  const r = cli(dir, 'workorder', 'check', 'red');
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /REFUSED: doctor --strict is red: PROBLEM/);
});

test('an order with no install block is warned, not refused', () => {
  const { status, out } = check('no-block', CLEAN.replace(/```claude-packs[\s\S]*?```\n/, ''));
  assert.equal(status, 0, out);
  assert.match(out, /WARNING: no install block/);
});
