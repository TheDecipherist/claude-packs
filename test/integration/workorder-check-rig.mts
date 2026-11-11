// What the workorder-check files share: a clean order, one base install they write their orders into, and the planted faults, each
// refused with the line that names it.
import { assert, cli, execFileSync, join, mkdirSync, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';

export const CLEAN = `# Work order: billing

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

// One base install, shared by the tests of a file: each case writes its own order into it.
const project: string = (() => {
  const dir = fixture('base');
  execFileSync('git', ['init', '-q'], { cwd: dir });
  return dir;
})();

export function check(name: string, order: string): { status: number | null; out: string } {
  mkdirSync(join(project, 'docs/workorders', name), { recursive: true });
  writeFileSync(join(project, 'docs/workorders', name, 'workorder.md'), order);
  const r = cli(project, 'workorder', 'check', name);
  return { status: r.status, out: r.stdout + r.stderr };
}

const FAULTS: Readonly<Record<string, readonly [order: string, said: RegExp]>> = {
  'a placeholder left outside a code fence': [CLEAN.replace('Invoices for the shop', 'Invoices for <the customer>'), /line 3: a placeholder is left: <the customer>/],
  'a step with no Done when line': [CLEAN.replace('**Done when:** test/invoice.test.mjs passes.\n', 'Write it.\n'), /step "W1\. The invoice" has no \*\*Done when:\*\* line/],
  'a Done when with no number and no path to a test': [CLEAN.replace('test/invoice.test.mjs passes.', 'the invoices look right.'), /line 16: the Done when of "W1\. The invoice" holds no number and no path to a test/],
  'a skill the project has not installed': [CLEAN.replace('checked by `pick-tests`', 'checked by `pick-tests` and `measure-tone`'), /not installed here: `measure-tone` \(line 3\); `add audio-core` brings it/],
  'a planner skill, which a run cannot use': [CLEAN.replace('checked by `pick-tests`', 'planned with `workorder-writer`'), /planner skills for claude\.ai.*`workorder-writer` \(line 3\)/],
};

/** One test per named fault: the check refuses it with the line that names it. */
export function holdsRefusals(names: readonly string[]): void {
  for (const fault of names) {
    const [order, said] = FAULTS[fault] ?? ['', /^$/];
    test(`refused: ${fault}`, () => {
      const { status, out } = check(fault.replace(/\W+/g, '-'), order);
      assert.equal(status, 1, out);
      assert.match(out, said);
      assert.match(out, /1 refusal\(s\)/);
    });
  }
}
