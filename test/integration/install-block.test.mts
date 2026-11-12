// planner W3: a work order's install block (a ```claude-packs fence) is what `init --from` and `new --from` install, so the order is
// the one source of a project's set-up. Its keys are the kit's own; an unknown one is refused by name and nothing is installed.
// (The rebuild template and the plugin templates: install-block-rebuild and install-block-plugin, split so no file sums over a minute.)
import { assert, cli, existsSync, fresh, git, join, registeredHooks, test, writeFileSync } from '../kit-cli.mts';
import { readLayout } from '../../packs/base/hooks/lib/layout.mts';
import { holdsTemplates, initFrom, orderWith } from './install-block-rig.mts';

holdsTemplates(['generic']);

test('the block\'s own layout keys land in layout.json, and what enable names switches on', () => {
  const dir = fresh('from-keys-');
  const order = orderWith('configuration: synth-creator\npacks:\n  - cpp\n  - audio-core\nenable:\n  - hooks/user-asks.mjs\ncommands:\n  test: ctest --preset dev\n');
  const r = initFrom(dir, order);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const layout = readLayout(dir);
  assert.deepEqual(layout.enable, ['hooks/user-asks.mjs']);
  assert.equal(layout.commands?.test, 'ctest --preset dev');
  assert.ok(existsSync(join(dir, '.claude/hooks/user-asks.mjs')), 'the opt-in hook enable names is installed');
  assert.ok(registeredHooks(dir).includes('user-asks'), 'and runs');
});

test('an unknown key is refused by name, and nothing is installed', () => {
  const dir = fresh('from-unknown-');
  const r = initFrom(dir, orderWith('configuration: base\npacks: base\nlooksies: []\n'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /"looksies", a key the kit does not read\. It takes: configuration, packs, files, .*looks.*Nothing was installed/);
  assert.ok(!existsSync(join(dir, '.claude')), 'nothing installed');
});

test('an order with no block, or two, is refused', () => {
  const none = join(fresh('order-'), 'workorder.md');
  writeFileSync(none, '# Work order: x\n');
  assert.match(initFrom(fresh('from-none-'), none).stderr, /has no install block/);
  const two = orderWith('configuration: base\n```\n\n```claude-packs\nconfiguration: base\n');
  assert.match(initFrom(fresh('from-two-'), two).stderr, /has 2 install blocks/);
});

test('new --from installs the block and commits it with the scaffold', () => {
  const parent = fresh('new-from-');
  const order = orderWith('configuration: synth-creator\npacks: cpp, audio-core\nlooks:\n  - name: panel\n    reference: design/reference/panel.png\n    code: ["src/ui/**"]\n');
  const r = cli(parent, 'new', 'scratch', '--config', 'synth-creator', '--from', order);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const dir = join(parent, 'scratch');
  assert.equal(readLayout(dir).looks?.[0]?.name, 'panel');
  assert.equal(git(dir, 'status', '--porcelain'), '', 'the block is in the first commit');
  assert.match(cli(parent, 'new', 'other', '--config', 'base', '--from', order).stderr, /--config base and the install block's configuration synth-creator differ/);
});
