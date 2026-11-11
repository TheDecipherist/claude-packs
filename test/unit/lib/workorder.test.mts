// lib/workorder.mts: a work order is made from a template, never over one that exists, and a name is a plain one.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { readText, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { assertTemplate, isPlainName, newWorkorder, workorderTemplates } from '../../../lib/workorder.mts';

test('the templates the kit has are listed, and one it lacks is refused with the list', () => {
  assert.deepEqual(workorderTemplates(), ['generic', 'plugin', 'rebuild']);
  assert.throws(() => assertTemplate('nope'), /the kit has generic, plugin, rebuild/);
});

test('a plain name has letters, digits, . _ -, and never starts with a dash', () => {
  assert.equal(isPlainName('billing-2.v1'), true);
  for (const bad of ['--help', '', 'a/b', undefined, 7]) assert.equal(isPlainName(bad), false, String(bad));
});

test('newWorkorder writes the three files with the name and the date filled in, and refuses to write over one', () => {
  const dir = scratchDir('wo-unit-');
  const lines: string[] = [];
  assert.equal(newWorkorder(dir, 'billing', { log: (l) => lines.push(l), now: new Date('2026-01-02T03:04:05Z') }), 0);
  for (const file of ['workorder.md', 'PROMPT.md', 'run.sh']) assert.doesNotMatch(readText(join(dir, 'docs/workorders/billing', file)) ?? '{{', /\{\{/, file);
  assert.match(readText(join(dir, 'docs/workorders/billing/workorder.md')) ?? '', /2026-01-02/);
  assert.match(lines[0] ?? '', /template generic/);
  assert.throws(() => newWorkorder(dir, 'billing'), /already exists: nothing was written/);
  assert.throws(() => newWorkorder(dir, '--help'), /name the work order/);
});
