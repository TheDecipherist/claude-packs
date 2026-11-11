// What the two new-project files (kf-new-projects, kf-new-projects-doctor) share: a project as a new one is, and a file written into it.
import { git, join, put } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';

export const putIn = (dir: string, rel: string, text: string): void => put(join(dir, rel), text);

/** A copy of the audio-core install, on a work/ branch (what a new project is). */
export function unit(): string {
  const dir = fixture('audio-core');
  git(dir, 'init', '-q', '--initial-branch', 'work/x');
  return dir;
}
