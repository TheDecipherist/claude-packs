// making: a prompt that names an instance of a many concept is told to build for all of them. The hook's contract (it exports no
// worktreeCase: the case is the one test/worktrees.test.mjs kept as a function), then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { assert } from '../../kit-cli.mts';
import { fireAs } from '../../worktree-rig.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';
import type { Checkouts } from '../hook-rig.mts';

// a manifest with one many concept
const SHAPE = toJson({ concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] });
const prompt = (cwd: string) => ({ hook_event_name: 'UserPromptSubmit', prompt: 'drive slot 2 louder', cwd });

holdsTheContract({
  hook: 'making.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    put(join(project, 'design/shape.json'), SHAPE);
    return { payload: prompt(project), status: 0 };
  },
  worktree: ({ here, wt }: Checkouts) => {
    put(join(wt, 'design/shape.json'), SHAPE);
    const said = (cwd: string): string => fireAs(here, 'making.mjs', prompt(cwd)).stdout;
    assert.match(said(wt), /you named slot 2: building for all slots/);
    assert.doesNotMatch(said(here), /you named/, 'main has no manifest yet');
  },
});
