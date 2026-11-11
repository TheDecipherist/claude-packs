// planner W2: `workorder check <name>`, the pre-flight before a run. One planted fault per refusal, each refused with the line that
// names it; a clean order passes; an order with no install block is warned and still passes.
import { assert, cli, execFileSync, fresh, join, mkdirSync, test, writeFileSync } from './kit-cli.mts';

const CLEAN = `# Work order: billing

**What this is.** Invoices for the shop, checked by \`pick-tests\` before each landing.

\`\`\`claude-packs
configuration: base
packs: base
\`\`\`

## W0. Set up

**Done when:** \`doctor --strict\` is OK with 0 problems.

## W1. The invoice

**Done when:** test/invoice.test.mjs passes.
`;

// One base install, shared: each case writes its own order into it.
const project = (() => {
  const dir = fresh('wo-check-');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  assert.equal(cli(dir, 'init', '--config', 'base').status, 0);
  return dir;
})();

function check(name, order) {
  mkdirSync(join(project, 'docs/workorders', name), { recursive: true });
  writeFileSync(join(project, 'docs/workorders', name, 'workorder.md'), order);
  const r = cli(project, 'workorder', 'check', name);
  return { status: r.status, out: r.stdout + r.stderr };
}

test('a clean order passes', () => {
  const { status, out } = check('clean', CLEAN);
  assert.equal(status, 0, out);
  assert.match(out, /workorder check clean: OK/);
  assert.doesNotMatch(out, /WARNING/);
});

const FAULTS = {
  'a placeholder left outside a code fence': [CLEAN.replace('Invoices for the shop', 'Invoices for <the customer>'), /line 3: a placeholder is left: <the customer>/],
  'a step with no Done when line': [CLEAN.replace('**Done when:** test/invoice.test.mjs passes.\n', 'Write it.\n'), /step "W1\. The invoice" has no \*\*Done when:\*\* line/],
  'a Done when with no number and no path to a test': [CLEAN.replace('test/invoice.test.mjs passes.', 'the invoices look right.'), /line 16: the Done when of "W1\. The invoice" holds no number and no path to a test/],
  'a skill the project has not installed': [CLEAN.replace('checked by `pick-tests`', 'checked by `pick-tests` and `measure-tone`'), /not installed here: `measure-tone` \(line 3\); `add audio-core` brings it/],
  'a planner skill, which a run cannot use': [CLEAN.replace('checked by `pick-tests`', 'planned with `workorder-writer`'), /planner skills for claude\.ai.*`workorder-writer` \(line 3\)/],
};

for (const [fault, [order, said]] of Object.entries(FAULTS)) {
  test(`refused: ${fault}`, () => {
    const { status, out } = check(fault.replace(/\W+/g, '-'), order);
    assert.equal(status, 1, out);
    assert.match(out, said);
    assert.match(out, /1 refusal\(s\)/);
  });
}

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

test('refused: doctor --strict red', () => {
  const dir = fresh('wo-check-red-');
  assert.equal(cli(dir, 'init', '--config', 'base').status, 0);
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
