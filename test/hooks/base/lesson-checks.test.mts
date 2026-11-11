// lesson-checks: a known bug is refused when it is brought back. The hook's contract (its selftest, its worktree case, the emitted
// verdict equal to the source's), then the refusals that sat in the old root test files. A pack's own checks are held in
// test/hooks/<pack>/lesson-checks.test.mts.
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { write } from '../../fixtures/installs.mts';
import { assert } from '../../kit-cli.mts';
import { fire } from '../../worktree-rig.mts';
import { fixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';

const APVTS = 'void Filter::prepare (juce::AudioProcessorValueTreeState& apvts) { cutoff = apvts.getRawParameterValue ("cutoff"); }\n';

// The worktree's own check (the hook's data case), then the step that moves a concept in the worktree's layout.
async function worktree(checkouts: Checkouts): Promise<void> {
  await installedWorktreeCase(checkouts, 'lesson-checks.mjs');
  const { here, wt } = checkouts;
  // The worktree's branch moved the dsp concept into src/engine: its own layout.json decides, not main's.
  const layoutFile = join(wt, '.claude/layout.json');
  const layout = parseJson<{ concepts: Record<string, string[]> }>(readFileSync(layoutFile, 'utf8'));
  assert.ok(layout?.concepts['dsp'], 'the install has a dsp concept');
  layout.concepts['dsp'] = [...layout.concepts['dsp'], 'src/engine/**'];
  writeFileSync(layoutFile, toJson(layout));
  assert.equal(fire(here, 'lesson-checks.mjs', join(wt, 'src/dsp/Filter.cpp'), APVTS), 2);
  assert.equal(fire(here, 'lesson-checks.mjs', join(wt, 'src/engine/Filter.cpp'), APVTS), 2);
  assert.equal(fire(here, 'lesson-checks.mjs', join(here, 'src/engine/Filter.cpp'), APVTS), 0);
  assert.equal(fire(here, 'lesson-checks.mjs', join(wt, 'src/dsp/Filter.cpp'), 'void Filter::setParams (const P& p) noexcept {}\n'), 0);
}

holdsTheContract({
  hook: 'lesson-checks.mjs',
  dir: () => fixture('audio-core'),
  same: (project) => ({ payload: write(join(project, 'src/dsp/Filter.cpp'), APVTS), status: 2 }),
  worktree,
});
