// What the gpu-painter pack files share: the synth with the gpu-painter pack, a git repo of an install, and a synth with a UI file.
import { join } from 'node:path';
import { put } from '../../../packs/base/hooks/lib/files.mts';
import { git } from '../../kit-cli.mts';
import { extraFixture, fixture } from '../hook-rig.mts';
import type { FixtureName } from '../hook-rig.mts';

// the old tests' synth: the synth-creator configuration with the gpu-painter pack, and not audio-core (no fixture names it)
export const synthInstall = (): string => extraFixture('synth-gpu-painter', ['gpu-painter', '--config', 'synth-creator']);
/** A git repo of a copy of an install (doctor reads the repo), the way each old test made its project. */
export const repoOf = (name: FixtureName | 'synth'): string => {
  const dir = name === 'synth' ? synthInstall() : fixture(name);
  git(dir, 'init', '-q');
  return dir;
};
export const synthWithUi = (): string => {
  const dir = repoOf('synth');
  put(join(dir, 'src/ui/Knob.cpp'), 'int knob() { return 1; }\n');
  return dir;
};
