// What the install-block files share: an order holding a block, `init --from` it, and the test that a template's own block installs and
// passes doctor --strict.
import { assert, cli, fresh, join, readFileSync, test, writeFileSync } from '../kit-cli.mts';
import { readLayout } from '../../packs/base/hooks/lib/layout.mts';
import { lockOf } from '../fixtures/installs.mts';

const group = (text: string, re: RegExp): string => text.match(re)?.[1] ?? '';

/** An order holding `block` as its install block, written to a scratch file. */
export function orderWith(block: string): string {
  const file = join(fresh('order-'), 'workorder.md');
  writeFileSync(file, `# Work order: x\n\n## W0. Set up\n\n\`\`\`claude-packs\n${block}\`\`\`\n\n**Done when:** 1 install.\n`);
  return file;
}

// `init --from <order>` in `dir`: the one place these files start an install from a block, which is every test's subject.
export const initFrom = (dir: string, order: string) => cli(dir, 'init', '--from', order);

/** One test per named template: its own block installs with init --from, and doctor --strict is green there. */
export function holdsTemplates(templates: readonly string[]): void {
  for (const template of templates) {
    test(`the ${template} template's own block installs with init --from, and doctor --strict is green there`, () => {
      const dir = fresh(`from-${template}-`);
      assert.equal(cli(dir, 'workorder', 'o', '--template', template).status, 0);
      const r = initFrom(dir, join(dir, 'docs/workorders/o/workorder.md'));
      assert.equal(r.status, 0, r.stdout + r.stderr);
      const strict = cli(dir, 'doctor', '--strict');
      assert.equal(strict.status, 0, strict.stdout);
      const text = readFileSync(join(dir, 'docs/workorders/o/workorder.md'), 'utf8');
      assert.equal(readLayout(dir).configuration, group(text, /^configuration: (\S+)$/m));
      for (const pack of group(text, /^packs: (.*)$/m).split(',').map((p) => p.trim())) assert.ok(lockOf(dir).packs?.includes(pack) || pack === 'base', pack);
    });
  }
}
