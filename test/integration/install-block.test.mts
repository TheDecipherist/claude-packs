// planner W3: a work order's install block (a ```claude-packs fence) is what `init --from` and `new --from` install, so the order is
// the one source of a project's set-up. Its keys are the kit's own; an unknown one is refused by name and nothing is installed.
import { assert, cli, existsSync, fresh, git, join, readFileSync, test, writeFileSync } from '../kit-cli.mts';
import { readLayout } from '../../packs/base/hooks/lib/layout.mts';
import { parseJson } from '../../packs/base/hooks/lib/json.mts';
import { lockOf } from '../fixtures/installs.mts';

const layoutOf = readLayout;
const group = (text: string, re: RegExp): string => text.match(re)?.[1] ?? '';

// An order holding `block` as its install block, written to a scratch file.
function orderWith(block: string): string {
  const file = join(fresh('order-'), 'workorder.md');
  writeFileSync(file, `# Work order: x\n\n## W0. Set up\n\n\`\`\`claude-packs\n${block}\`\`\`\n\n**Done when:** 1 install.\n`);
  return file;
}

for (const template of ['generic', 'plugin', 'rebuild']) {
  test(`the ${template} template's own block installs with init --from, and doctor --strict is green there`, () => {
    const dir = fresh(`from-${template}-`);
    assert.equal(cli(dir, 'workorder', 'o', '--template', template).status, 0);
    const r = cli(dir, 'init', '--from', join(dir, 'docs/workorders/o/workorder.md'));
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const strict = cli(dir, 'doctor', '--strict');
    assert.equal(strict.status, 0, strict.stdout);
    const text = readFileSync(join(dir, 'docs/workorders/o/workorder.md'), 'utf8');
    assert.equal(layoutOf(dir).configuration, group(text, /^configuration: (\S+)$/m));
    for (const pack of group(text, /^packs: (.*)$/m).split(',').map((p) => p.trim())) assert.ok(lockOf(dir).packs?.includes(pack) || pack === 'base', pack);
  });
}

test('the block\'s own layout keys land in layout.json, and what enable names switches on', () => {
  const dir = fresh('from-keys-');
  const order = orderWith('configuration: synth-creator\npacks:\n  - cpp\n  - audio-core\nenable:\n  - hooks/user-asks.mjs\ncommands:\n  test: ctest --preset dev\n');
  const r = cli(dir, 'init', '--from', order);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const layout = layoutOf(dir);
  assert.deepEqual(layout.enable, ['hooks/user-asks.mjs']);
  assert.equal(layout.commands?.test, 'ctest --preset dev');
  assert.ok(existsSync(join(dir, '.claude/hooks/user-asks.mjs')), 'the opt-in hook enable names is installed');
  assert.match(readFileSync(join(dir, '.claude/settings.json'), 'utf8'), /user-asks\.mjs/, 'and runs');
});

test('an unknown key is refused by name, and nothing is installed', () => {
  const dir = fresh('from-unknown-');
  const r = cli(dir, 'init', '--from', orderWith('configuration: base\npacks: base\nlooksies: []\n'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /"looksies", a key the kit does not read\. It takes: configuration, packs, files, .*looks.*Nothing was installed/);
  assert.ok(!existsSync(join(dir, '.claude')), 'nothing installed');
});

test('an order with no block, or two, is refused', () => {
  const none = join(fresh('order-'), 'workorder.md');
  writeFileSync(none, '# Work order: x\n');
  assert.match(cli(fresh('from-none-'), 'init', '--from', none).stderr, /has no install block/);
  const two = orderWith('configuration: base\n```\n\n```claude-packs\nconfiguration: base\n');
  assert.match(cli(fresh('from-two-'), 'init', '--from', two).stderr, /has 2 install blocks/);
});

test('new --from installs the block and commits it with the scaffold', () => {
  const parent = fresh('new-from-');
  const order = orderWith('configuration: synth-creator\npacks: cpp, audio-core\nlooks:\n  - name: panel\n    reference: design/reference/panel.png\n    code: ["src/ui/**"]\n');
  const r = cli(parent, 'new', 'scratch', '--config', 'synth-creator', '--from', order);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const dir = join(parent, 'scratch');
  assert.equal(layoutOf(dir).looks?.[0]?.name, 'panel');
  assert.equal(git(dir, 'status', '--porcelain'), '', 'the block is in the first commit');
  assert.match(cli(parent, 'new', 'other', '--config', 'base', '--from', order).stderr, /--config base and the install block's configuration synth-creator differ/);
});

// planner W9's Done when, end to end: a project made with its work order from the plugin template installs from that order's own
// block, and doctor --strict is green there. An unknown template makes nothing.
test('new --template plugin, then init --from its own order, is green under doctor --strict', () => {
  const parent = fresh('new-template-');
  const made = cli(parent, 'new', 'scratch', '--config', 'synth-creator', '--template', 'plugin');
  assert.equal(made.status, 0, made.stdout + made.stderr);
  const dir = join(parent, 'scratch');
  const r = cli(dir, 'init', '--from', join(dir, 'docs/workorders/scratch/workorder.md'));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(layoutOf(dir).looks?.[0]?.name, 'panel', 'the template block\'s looks');
  const strict = cli(dir, 'doctor', '--strict');
  assert.equal(strict.status, 0, strict.stdout);
  assert.equal(cli(parent, 'new', 'other', '--template', 'nope').status, 2);
  assert.ok(!existsSync(join(parent, 'other')), 'nothing was made');
});
