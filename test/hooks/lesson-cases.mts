// What the check packs' tests share when they fire the base `lesson-checks` hook at an install: a write and its verdict, the
// "refused with this check's id" assertion, and one test per [pack, file, bad, good] case run on copies of one install (the old
// `holdsEachCase` made an install per case).
import { assert, lessonWrite, test } from '../kit-cli.mts';
import type { EachCase, Spawned } from '../kit-cli.mts';
import { extraFixture } from './hook-rig.mts';

export const lintWrite = lessonWrite;

/** The write is refused (exit 2) and the reason names the check `id`. */
export function assertRefused(dir: string, rel: string, content: string, id: string | RegExp): Spawned {
  const r = lessonWrite(dir, rel, content);
  assert.equal(r.status, 2, `${rel}: ${content}`);
  assert.match(r.stderr, typeof id === 'string' ? new RegExp(id) : id);
  return r;
}

/** The write passes. */
export function assertTaken(dir: string, rel: string, content: string): void {
  assert.equal(lessonWrite(dir, rel, content).status, 0, `${rel}: ${content}`);
}

/** One test per case, each on a fresh copy of the install `install` makes: the pack's check refuses the fault and takes the fix. */
export function holdsEachCaseIn(install: () => string, cases: readonly EachCase[]): void {
  for (const [pack, file, bad, good] of cases) {
    test(`${pack}: ${file} is refused its fault and takes the fix`, () => {
      const dir = install();
      assert.equal(lessonWrite(dir, file, bad).status, 2);
      assert.equal(lessonWrite(dir, file, good).status, 0);
    });
  }
}

/** The install the review-packs cases (0.25.0) run in: every pack they name, together (they were one install each). */
export const reviewPacksInstall = (): string =>
  extraFixture('review-packs', ['http-api', 'react', 'multi-tenant', 'websocket', 'host-agent', 'go', 'rust', 'postgres', 'dynamic-data', 'ci']);

/** The install the audio-packs cases (0.28.0) run in: the synth-creator configuration with the playbook's packs, but not cpp: its
 *  `cpp-no-mutable-global` refuses the midi and sound-design examples, which were written for an install without it. */
export const audioPacksInstall = (): string =>
  extraFixture('audio-packs', ['--config', 'synth-creator', 'midi', 'sound-design', 'audio-core', 'reverse-engineering', 'instrument-shell']);

/** The install the cpp pack's cases run in: the synth-creator configuration with the cpp pack. */
export const cppPackInstall = (): string => extraFixture('cpp-pack', ['--config', 'synth-creator', 'cpp']);
