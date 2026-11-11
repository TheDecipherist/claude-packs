// planner W3 and W9: the plugin template's own block installs with `init --from`, and a project made with that template installs from its
// own order (split from install-block.test.mts so no file sums over a minute).
import { assert, cli, existsSync, fresh, join, test } from '../kit-cli.mts';
import { readLayout } from '../../packs/base/hooks/lib/layout.mts';
import { holdsTemplates, initFrom } from './install-block-rig.mts';

holdsTemplates(['plugin']);

// planner W9's Done when, end to end: a project made with its work order from the plugin template installs from that order's own
// block, and doctor --strict is green there. An unknown template makes nothing.
test('new --template plugin, then init --from its own order, is green under doctor --strict', () => {
  const parent = fresh('new-template-');
  const made = cli(parent, 'new', 'scratch', '--config', 'synth-creator', '--template', 'plugin');
  assert.equal(made.status, 0, made.stdout + made.stderr);
  const dir = join(parent, 'scratch');
  const r = initFrom(dir, join(dir, 'docs/workorders/scratch/workorder.md'));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readLayout(dir).looks?.[0]?.name, 'panel', 'the template block\'s looks');
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 0, strict.stdout);
  assert.equal(cli(parent, 'new', 'other', '--template', 'nope').status, 2);
  assert.ok(!existsSync(join(parent, 'other')), 'nothing was made');
});
