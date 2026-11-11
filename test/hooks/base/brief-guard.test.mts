// brief-guard: a brief, a spec or a recipe names an instance of a concept only as the example. The hook's contract (its selftest,
// its worktree case, the emitted verdict equal to the source's), then the refusals that sat in the old root test files.
import { join } from 'node:path';
import { put } from '../../kit-cli.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const SHAPE = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] };

holdsTheContract({
  hook: 'brief-guard.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    put(join(project, 'design/shape.json'), JSON.stringify(SHAPE));
    return { payload: { tool_name: 'Agent', tool_input: { description: 'build', prompt: 'Build the delay. Drive slot 2 and check it works.' } }, status: 2 };
  },
});
