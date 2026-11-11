// lib/fix-plan.mts: a scan's findings as boxes, in the order they are fixed; and the pointer to the last scan.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { fixPlan, planText } from '../../../lib/fix-plan.mts';
import { pointerOf, rememberScan } from '../../../lib/scan.mts';

test('every finding is a box, the sections come in the order a senior engineer fixes them, and an empty section is left out', () => {
  const text = planText('/p', {
    pick: { config: 'node', packs: [{ pack: 'js-ts' }] },
    secrets: [{ file: 'a.ts', line: 3, name: 'token' }],
    results: [{ id: 'x', kind: 'security', pack: 'base', why: 'w', hits: [{ file: 'b.ts', line: 1, text: 'y' }] }],
    longFiles: ['big.ts'],
  });
  assert.match(text, /- \[ \] a\.ts:3: token/);
  assert.match(text, /- \[ \] b\.ts:1: `y`/);
  assert.match(text, /configuration node, packs js-ts/);
  assert.ok(text.indexOf('## 1. Secrets') < text.indexOf('## 2. Security'));
  assert.ok(text.indexOf('## 2. Security') < text.indexOf('## 6. Long files'));
  assert.ok(!text.includes('## 3. Failures'));
  assert.match(text, /4 finding\(s\)|3 finding\(s\)/);
});

test('a backtick in a hit cannot break the box it is quoted in', () => {
  const text = planText('/p', { results: [{ id: 'x', kind: 'quality', pack: 'base', why: 'w', hits: [{ file: 'a.ts', line: 1, text: 'a `b` c' }] }] });
  assert.match(text, /`a 'b' c`/);
});

test('fixPlan writes the plan from the scan a pointer names, and a scan file that is not JSON stops it', async () => {
  const project = scratchDir('plan-project-');
  const out = scratchDir('plan-out-');
  const json = join(out, 'claude-packs-scan.json');
  put(json, '{"secrets":[{"file":"k.ts","line":2,"name":"key"}]}');
  rememberScan(project, json);
  assert.equal(readText(pointerOf(project)), json);
  const file = await fixPlan(project, { out: join(out, 'plan.md'), log: () => {} });
  assert.match(readText(file) ?? '', /k\.ts:2: key/);
  put(json, '{ not json');
  await assert.rejects(fixPlan(project, { from: json, out: join(out, 'plan2.md'), log: () => {} }), /not valid JSON/);
});

test('the pointer is named for the project: two folders, two pointers', () => {
  assert.notEqual(pointerOf('/a'), pointerOf('/b'));
  assert.equal(pointerOf('/a'), pointerOf('/a/'));
});
