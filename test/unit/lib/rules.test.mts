// lib/rules.mts: a rule's `paths:` regenerated from its `# concepts:` line and the layout.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import type { Layout } from '../../../packs/base/hooks/lib/types.d.mts';
import { applyPaths, renderRule } from '../../../lib/rules.mts';

const LAYOUT: Layout = { folders: { dsp: { path: 'src/dsp' } }, concepts: { audio: ['dsp'], docs: ['docs/**'] } };
const RULE = '---\n# concepts: audio, docs\npaths:\n  - "old/**"\n---\n# Title\n';

test('a rule gets the globs of its concepts, in order, and keeps its body', () => {
  assert.equal(renderRule(RULE, LAYOUT), '---\n# concepts: audio, docs\npaths:\n  - "src/dsp/**"\n  - "docs/**"\n---\n# Title\n');
});

test('a rule with no concepts line, or no front matter, is left alone (null)', () => {
  assert.equal(renderRule('---\ndescription: x\n---\nbody\n', LAYOUT), null);
  assert.equal(renderRule('# only a title\n', LAYOUT), null);
});

test('a concept the layout lacks: null, unless strict, which throws', () => {
  const throwing = (): string[] => { throw new Error('no concept'); };
  assert.equal(renderRule(RULE, LAYOUT, throwing), null);
  assert.throws(() => renderRule(RULE, LAYOUT, throwing, true), /no concept/);
});

test('applyPaths counts stale rules, writes them unless checkOnly, and leaves a skipped one', async () => {
  const dir = scratchDir('rules-');
  put(join(dir, '.claude/layout.json'), JSON.stringify(LAYOUT));
  put(join(dir, '.claude/hooks/lib/layout.mjs'), readFileSync(new URL('../../../packs/base/hooks/lib/layout.mjs', import.meta.url), 'utf8'));
  for (const f of ['files', 'json']) put(join(dir, `.claude/hooks/lib/${f}.mjs`), readFileSync(new URL(`../../../packs/base/hooks/lib/${f}.mjs`, import.meta.url), 'utf8'));
  put(join(dir, '.claude/rules/a.md'), RULE);
  put(join(dir, '.claude/rules/mine.md'), RULE);
  const skip = new Set([join('.claude', 'rules', 'mine.md')]);
  assert.deepEqual(await applyPaths(dir, { checkOnly: true, skip }), { stale: 1 });
  assert.equal(readFileSync(join(dir, '.claude/rules/a.md'), 'utf8'), RULE, 'checkOnly writes nothing');
  assert.deepEqual(await applyPaths(dir, { skip }), { stale: 1 });
  assert.match(readFileSync(join(dir, '.claude/rules/a.md'), 'utf8'), /"src\/dsp\/\*\*"/);
  assert.equal(readFileSync(join(dir, '.claude/rules/mine.md'), 'utf8'), RULE, 'the skipped rule is the user\'s');
  assert.deepEqual(await applyPaths(dir, { skip }), { stale: 0 });
});
