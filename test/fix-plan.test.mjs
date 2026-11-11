// 0.25.0: after a scan, one command makes the work order Claude follows, so everything found is fixed by the kit's own laws.
import { assert, cli, existsSync, fresh, join, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mts';
import { planText } from '../lib/fix-plan.mjs';

const helper = (f, a) => `export function ${f}(${a}) {\n${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `  const v${i} = compute(${a}.rows[${i}], ${i}, 'k${i}', other(${a}, ${i}));`).join('\n')}\n  return ${a};\n}\n`;

function project() {
  const dir = fresh('fix-');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/a.ts'), helper('loadOrders', 'row'));
  writeFileSync(join(dir, 'src/b.ts'), helper('readInvoices', 'item'));
  writeFileSync(join(dir, 'src/c.py'), 'try:\n    run()\nexcept:\n    log()\n');
  return dir;
}

test('fix after a scan: a plan in the order to work it, every finding a box', () => {
  const dir = project();
  assert.equal(cli(dir, 'scan').status, 0);
  const r = cli(dir, 'fix');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const plan = readFileSync(join(dir, '.claude/fix-plan.md'), 'utf8');
  assert.match(plan, /## 0\. Install the kit[\s\S]*## 4\. Copies become templates[\s\S]*## 5\. Quality/);
  assert.match(plan, /- \[ \] .*src\/[ab]\.ts/);
  assert.match(plan, /src\/c\.py:3/);
  assert.match(plan, /make-it-a-template/);
  assert.match(plan, /fix-from-scan/);
});

test('fix with no scan yet scans first; the project gets only the plan', () => {
  const dir = project();
  assert.equal(cli(dir, 'fix').status, 0);
  assert.ok(existsSync(join(dir, '.claude/fix-plan.md')));
  assert.ok(!existsSync(join(dir, '.claude/hooks')));
});

test('the plan orders secrets before everything, and leaves out what is empty', () => {
  const text = planText('/p', { pick: { config: 'node', packs: [{ pack: 'js-ts' }] }, secrets: [{ file: 'a.ts', line: 3, name: 'token' }], results: [{ id: 'x', kind: 'security', why: 'w', hits: [{ file: 'b.ts', line: 1, text: 'y' }] }], repeats: [] });
  assert.ok(text.indexOf('## 1. Secrets') < text.indexOf('## 2. Security'));
  assert.doesNotMatch(text, /## 4\. Copies/);
  assert.match(text, /a\.ts:3: token/);
});
