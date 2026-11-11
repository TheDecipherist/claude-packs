// shape-law: an instance of a many concept is never a bare literal. The hook's contract, then its refusals.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

const LANE_SHAPE = { concepts: { lane: { shape: 'many', count: 8, generator: 'laneId(i)', words: ['lane', 'lanes'] } }, exclude: [] };

holdsTheContract({
  hook: 'shape-law.mjs',
  dir: () => fixture('base'),
  same: (project) => {
    put(join(project, 'design/shape.json'), toJson(LANE_SHAPE));
    return { payload: write(join(project, 'src/core/Lanes.cpp'), 'if (laneIx == 3) go();\n'), status: 2 };
  },
});
