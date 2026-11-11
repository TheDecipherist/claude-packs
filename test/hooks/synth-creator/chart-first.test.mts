// chart-first: no source is written before a chart is committed. The hook's contract, then the refusals that sat in the old root test
// files.
import { join } from 'node:path';
import { assert } from '../../kit-cli.mts';
import { withLayout, write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract, installedWorktreeCase } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';
import { fireAs } from '../../worktree-rig.mts';

holdsTheContract({
  hook: 'chart-first.mjs',
  dir: () => fixture('synth-creator'),
  same: (project) => ({ payload: write(join(project, 'src/dsp/Svf.cpp')), status: 2 }),
  // the hook's own case, then the layout step: the worktree's layout names a chart its HEAD holds (CLAUDE.md stands in for one);
  // main's names the default, which it lacks
  worktree: async (checkouts: Checkouts) => {
    const { here, wt } = checkouts;
    await installedWorktreeCase(checkouts, 'chart-first.mjs');
    withLayout(wt, { chart: 'CLAUDE.md' });
    const status = fireAs(here, 'chart-first.mjs', write(join(wt, 'src/core/Svf.cpp'))).status;
    assert.equal(status, 0, 'judged by the worktree');
  },
});
