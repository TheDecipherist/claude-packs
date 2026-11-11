// frozen-files: a frozen test or golden is refused every route. The hook's contract, then the refusals that sat in the old root test
// files.
import { join } from 'node:path';
import { put } from '../../kit-cli.mts';
import { toJson } from '../../../packs/base/hooks/lib/json.mts';
import { write } from '../../fixtures/installs.mts';
import { fixture, holdsTheContract } from '../hook-rig.mts';

holdsTheContract({
  hook: 'frozen-files.mjs',
  dir: () => fixture('synth-creator'),
  same: (project) => {
    put(join(project, '.claude/state/frozen.json'), toJson({ files: ['tests/**'], reason: 'bug 7' }));
    return { payload: write(join(project, 'tests/svf_test.cpp')), status: 2 };
  },
});
