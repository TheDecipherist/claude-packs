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

// the toolchain each named processor needs is settled before the run (re-toolchain): a processor with no toolchain.md, or with
// a disassembler or emulator still "missing", is refused; settled (found, found online, or the user's yes to build our own) passes
test('refused: a processor on the install block with its toolchain unsettled', async () => {
  const { checkWorkorder } = await import('../../lib/workorder-check.mts');
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join: j } = await import('node:path');
  const dir = mkdtempSync(j(tmpdir(), 'toolchain-order-'));
  const order = j(dir, 'docs', 'workorders', 'x');
  mkdirSync(order, { recursive: true });
  writeFileSync(j(order, 'workorder.md'), '# Work order: x\n\n```claude-packs\nconfiguration: base\npacks: base\nprocessors: H8/300H\n```\n\n## W0. Set up\n\n**Done when:** 1 test passes (`tests/x.test`).\n');
  const without = await checkWorkorder(dir, 'x', { withDoctor: false });
  assert.ok(without.refusals.some((r) => /no docs\/workorders\/x\/toolchain\.md/.test(r)), without.refusals.join('\n'));
  writeFileSync(j(order, 'toolchain.md'), '| Processor | Disassembler | Emulator | Ghidra module | Manuals in the library |\n|---|---|---|---|---|\n| H8/300H | ours: `dis.py` | missing | missing | missing |\n');
  assert.ok((await checkWorkorder(dir, 'x', { withDoctor: false })).refusals.some((r) => /H8\/300H's emulator is "missing"/.test(r)));
  writeFileSync(j(order, 'toolchain.md'), '| Processor | Disassembler | Emulator | Ghidra module | Manuals in the library |\n|---|---|---|---|---|\n| H8/300H | ours: `dis.py` | build our own (the user, yes, 2026-11-13) | missing | missing |\n');
  assert.ok(!(await checkWorkorder(dir, 'x', { withDoctor: false })).refusals.some((r) => /toolchain/.test(r)));
});
