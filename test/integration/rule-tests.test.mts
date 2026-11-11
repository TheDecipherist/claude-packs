// KF-31: a rule's own test can be missing for a whole build and nothing says so. The MPX 500's three rules each named a test that did not exist after
// nine steps, and the gap held four real bugs. doctor is red for an installed, live rule whose Check names a test nothing in the project answers to.
// (The pointers and the declined rule: rule-tests-pointers.test.mts; the new project and the new law: rule-tests-new.test.mts. Split so no
// file sums over a minute.)
import { assert, join, test } from '../kit-cli.mts';
import { namesATest } from '../../lib/rule-tests.mts';
import { put } from '../../packs/base/hooks/lib/files.mts';
import { RULE, says, unit } from './rule-tests-rig.mts';

test('a Check that names a test is told from one that does not', () => {
  for (const text of ['## Check\nTests:\n1. Prepare twice.\n', '## Check\n- Test: render it.\n', '## Check\nThreadSanitizer test: N threads.\n', '## Check\nBenchmark test, offline render: 96 voices.\n', '## Check\n- Unit test: constant input.\n']) assert.equal(namesATest(text), true, text);
  for (const text of ['## Check\n`doctor` is red for a hook.\n', '# Title\n\nTest: not in a Check section.\n', '## Check\nThe realtime-guard hook flags it.\n']) assert.equal(namesATest(text), false, text);
});

test('doctor is red for a live rule whose named test nothing answers to', () => {
  const r = says(unit());
  assert.match(r, /rule\(s\) name a test nothing in this project answers to/);
  assert.match(r, new RegExp(RULE));
});

test('a test that names the rule answers it', () => {
  const dir = unit();
  put(join(dir, 'tests/prepare_twice.cpp'), `// proves: ${RULE}\nint main() {}\n`);
  const r = says(dir);
  assert.doesNotMatch(r, new RegExp(`answers to:[^\\n]*${RULE}`));
});

test('a mention outside the test folders answers nothing', () => {
  const dir = unit();
  put(join(dir, 'docs/notes.md'), `${RULE} is on my list\n`);
  assert.match(says(dir), new RegExp(`answers to:[^\\n]*${RULE}`));
});

