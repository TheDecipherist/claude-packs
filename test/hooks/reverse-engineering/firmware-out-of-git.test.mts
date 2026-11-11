// firmware-out-of-git: firmware stays out of git, a named fixture may stay in. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { bash, git } from '../../fixtures/installs.mts';
import { extraFixture, holdsTheContract } from '../hook-rig.mts';

/** A copy of the install with reverse-engineering on the cpp configuration (no fixture names one). */
const reverseEngineeringInstall = (): string => extraFixture('reverse-engineering', ['reverse-engineering', '--config', 'cpp']);

holdsTheContract({
  hook: 'firmware-out-of-git.mjs',
  dir: reverseEngineeringInstall,
  same: (project) => {
    git(project, 'init', '-q');
    put(join(project, 'roms/os.bin'), 'x');
    return { payload: { ...bash('git add roms/os.bin'), cwd: project }, status: 2 };
  },
});
