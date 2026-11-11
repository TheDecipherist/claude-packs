// What the rule-tests files share: the rule they plant a test for, the audio-core install in a git repo with one C++ file the rule matches,
// and what doctor says of it.
import { cli, execFileSync, join } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { put } from '../../packs/base/hooks/lib/files.mts';

export const RULE = 'prepare-is-repeatable';

export function unit(): string {
  const dir = fixture('audio-core');
  execFileSync('git', ['init', '-q', '--initial-branch', 'work/x'], { cwd: dir });
  put(join(dir, 'src/dsp/Filter.cpp'), 'float gain = 1.0f;\n');
  return dir;
}
export const says = (dir: string): string => cli(dir, 'doctor').stdout;
