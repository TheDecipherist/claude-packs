// lib/workorder-check.mts: the pre-flight for a work order, one planted fault per refusal (doctor left out; test/workorder-check.test.mjs runs it with doctor).
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { checkWorkorder, hasInstallBlock, kitSkills, workorderCheck } from '../../../lib/workorder-check.mts';

const ORDER = (body: string): string => `# Work order: x\n\n\`\`\`claude-packs\npacks: base\n\`\`\`\n\n${body}`;

function project(body: string): string {
  const dir = scratchDir('wo-check-');
  put(join(dir, 'docs/workorders/x/workorder.md'), ORDER(body));
  put(join(dir, '.claude/claude-packs.lock.json'), JSON.stringify({ kit: '1', packs: ['base'], files: {} }));
  return dir;
}

test('a clean order passes: a measured Done when, a fenced placeholder and markup are not placeholders', async () => {
  const dir = project('## W1. Build\n\n**Done when:** test/a.test.mjs passes.\n\n```\n<name>\n```\n<constraints>\n');
  assert.deepEqual(await checkWorkorder(dir, 'x', { withDoctor: false }), { refusals: [], warnings: [] });
});

test('each planted fault is refused with the line that names it', async () => {
  const dir = project('## W1. Build\n\nUse <your-name> here.\n\n**Done when:** it works well.\n\n## W2. More\n\nno done line\n');
  const { refusals } = await checkWorkorder(dir, 'x', { withDoctor: false });
  assert.ok(refusals.some((r) => /^line 9: a placeholder is left: <your-name>/.test(r)), refusals.join('\n'));
  assert.ok(refusals.some((r) => /the Done when of "W1\. Build" holds no number and no path/.test(r)));
  assert.ok(refusals.some((r) => /step "W2\. More" has no \*\*Done when:\*\* line/.test(r)));
});

test('a kit skill the project lacks is refused with the pack to add; a planner skill is refused as claude.ai only', async () => {
  const skills = kitSkills();
  const [packSkill] = [...skills].find(([, v]) => v.pack === 'base') ?? [];
  const [plannerSkill] = [...skills].find(([, v]) => v.planner) ?? [];
  assert.ok(packSkill && plannerSkill);
  const dir = project(`## W1. Build\n\nRun \`${packSkill}\` and \`${plannerSkill}\`.\n\n**Done when:** 3 tests pass.\n`);
  const { refusals } = await checkWorkorder(dir, 'x', { withDoctor: false });
  assert.ok(refusals.some((r) => r.startsWith('not installed here:') && r.includes(`\`${packSkill}\` (line 9)`) && r.includes('`add base` brings it')), refusals.join('\n'));
  assert.ok(refusals.some((r) => r.startsWith('planner skills for claude.ai') && r.includes(plannerSkill)));
});

test('an order with no install block is warned; a missing order throws; workorderCheck prints and returns 0 or 1', async () => {
  assert.equal(hasInstallBlock('x\n```claude-packs\n'), true);
  assert.equal(hasInstallBlock('x\n```js\n'), false);
  const dir = scratchDir('wo-check-');
  put(join(dir, 'docs/workorders/x/workorder.md'), '## W1. a\n\n**Done when:** 2 pass.\n');
  put(join(dir, '.claude/claude-packs.lock.json'), JSON.stringify({ kit: '1', packs: ['base'], files: {} }));
  const said: string[] = [];
  assert.equal(await workorderCheck(dir, 'x', { log: (l) => said.push(l), withDoctor: false }), 0);
  assert.match(said[0] ?? '', /WARNING: no install block/);
  assert.equal(said.at(-1), 'workorder check x: OK (doctor not run)');
  await assert.rejects(() => checkWorkorder(dir, 'nope', { withDoctor: false }), /no work order at docs\/workorders\/nope/);
  await assert.rejects(() => workorderCheck(dir, undefined), /name the work order/);
  const bad = project('## W1. a\n');
  assert.equal(await workorderCheck(bad, 'x', { log: () => undefined, withDoctor: false }), 1);
});
