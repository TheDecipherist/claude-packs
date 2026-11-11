// lib/hover-gate.mts: a project with UI code under the hover rule names its gate, or declines it with a reason.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { hoverGateProblems } from '../../../lib/hover-gate.mts';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import type { Layout } from '../../../packs/base/hooks/lib/types.d.mts';

const layout = (gates?: unknown): Layout => ({ folders: {}, concepts: {}, ...(gates === undefined ? {} : { gates }) });

function project(): string {
  const dir = scratchDir('hover-unit-');
  put(join(dir, '.claude/rules/hover-every-pressable.md'), '---\npaths:\n  - "src/ui/**"\n---\n\n# rule\n');
  put(join(dir, '.claude/hooks/lib/glob.mjs'), 'export const matchesAny = (rel, globs) => globs.some((g) => rel.startsWith(g.replace("**", "")));\n');
  return dir;
}

test('no hover rule installed: nothing to prove', async () => {
  assert.deepEqual(await hoverGateProblems(scratchDir('hover-none-'), layout()), []);
});

test('UI code and no gate is a problem; a declared gate or a reasoned decline is not; a gate naming a missing file is', async () => {
  const dir = project();
  assert.deepEqual(await hoverGateProblems(dir, layout()), []);   // no UI file yet
  put(join(dir, 'src/ui/Knob.cpp'), 'int knob();\n');
  assert.match((await hoverGateProblems(dir, layout()))[0] ?? '', /no hover gate declared for the UI code \(src\/ui\/Knob\.cpp\)/);
  assert.match((await hoverGateProblems(dir, layout({ hover: 'none:' })))[0] ?? '', /no hover gate declared/);
  assert.deepEqual(await hoverGateProblems(dir, layout({ hover: 'none: no pointer' })), []);
  assert.match((await hoverGateProblems(dir, layout({ hover: 'node tools/hover.mjs' })))[0] ?? '', /names tools\/hover\.mjs, which is not there/);
  put(join(dir, 'tools/hover.mjs'), '');
  assert.deepEqual(await hoverGateProblems(dir, layout({ hover: 'node tools/hover.mjs' })), []);
});
