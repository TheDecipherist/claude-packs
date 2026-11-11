// The writing pack's checks (0.15.0), fired through the base lesson-checks hook: text that goes public reads like a person wrote it.
// One lesson check for each tell a regex can see; "prose": true leaves code and URLs out. The pack's install and skills:
// writing-pack.test.mts.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from '../hook-rig.mts';
import { assertRefused, assertTaken, lintWrite } from '../lesson-cases.mts';

test('the tells are refused in public text, by id; code, URLs and other files are left alone', () => {
  const dir = fixture('base');
  const tells: ReadonlyArray<readonly [string, string]> = [
    ['It works — mostly.\n', 'ascii-no-em-dash'], ['It works -- mostly.\n', 'ascii-no-em-dash'], ['A “quoted” word.\n', 'ascii-no-em-dash'],
    ["Here's the thing: it broke.\n", 'no-stock-connectors'], ['A robust tool.\n', 'no-slop-words'], ['The reality: nobody reads it.\n', 'no-dramatic-colon'],
    ['It serves as the entry.\n', 'no-copula-dodging'], ['It is fast, ensuring a smooth run.\n', 'no-trailing-ing'], ['Leveraging the cache, it flies.\n', 'no-participial-opener'],
    ['Experts say it is fine.\n', 'no-vague-attribution'], ['There is no one-size-fits-all answer.\n', 'no-pseudo-wisdom'],
    ["It's not a bug. It's a feature.\n", 'no-not-x-but-y'],
  ];
  for (const [text, id] of tells) assertRefused(dir, 'README.md', text, id);
  assertTaken(dir, 'README.md', 'Run `npm test -- a` first.\n\n```sh\nnpm test -- a — b\n```\n\nSee [the docs](https://x.dev/a--b-robust).\n');
  assertTaken(dir, 'bugs.md', 'A robust fix — last year.\n');   // an internal file is not public text
  assertTaken(dir, 'docs/manual/start.md', 'I wrote this page after the third time someone asked.\n');
  assert.equal(lintWrite(dir, 'docs/manual/bad.md', 'A seamless start.\n').status, 2);
});
