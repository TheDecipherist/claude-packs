// brief-guard-count: the recorder beside brief-guard (it counts each refused concept and judges nothing). The hook's contract
// (its selftest, its worktree case, the emitted verdict equal to the source's).
import { put } from '../../kit-cli.mts';
import { join } from 'node:path';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const SHAPE = { concepts: { slot: { shape: 'many', count: 4, generator: 'slotId(i, field)', words: ['slot', 'slots'] } }, exclude: [] };

holdsTheContract({
  hook: 'brief-guard-count.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    put(join(project, 'design/shape.json'), JSON.stringify(SHAPE));
    return { payload: { tool_name: 'Agent', tool_input: { description: 'build', prompt: 'Drive slot 2 and check it works.' } }, status: 0 };
  },
});
