// firmware-out-of-git: firmware stays out of git, a named fixture may stay in. The contract, then the refusals of the old root files.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { bash, git, withLayout } from '../../fixtures/installs.mts';
import { assert, hookRun, test } from '../../kit-cli.mts';
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

test('firmware stays out of git, a named fixture may stay in', () => {
  const dir = reverseEngineeringInstall();
  git(dir, 'init', '-q');
  put(join(dir, 'roms/os.bin'), 'x');
  put(join(dir, 'tests/fixtures/one.syx'), 'x');
  const add = (p: string): number | null => hookRun(dir, 'firmware-out-of-git.mjs', { ...bash(`git add ${p}`), cwd: dir }).status;
  assert.equal(add('roms/os.bin'), 2);
  assert.equal(add('tests/fixtures/one.syx'), 2);
  withLayout(dir, { guards: { firmware: { fixtures: ['tests/fixtures/**'] } } });
  assert.equal(add('tests/fixtures/one.syx'), 0);
});
