// KF-31: a rule's own test can be missing for a whole build and nothing says so. The MPX 500's three rules each named a test that did not exist after
// nine steps, and the gap held four real bugs. doctor is red for an installed, live rule whose Check names a test nothing in the project answers to.
import { assert, cli, execFileSync, fresh, join, mkdirSync, readFileSync, test, writeFileSync } from './kit-cli.mjs';
import { namesATest } from '../lib/rule-tests.mjs';

const RULE = 'prepare-is-repeatable';
const put = (dir, rel, text) => { mkdirSync(join(dir, rel, '..'), { recursive: true }); writeFileSync(join(dir, rel), text); };

function unit() {
  const dir = fresh('rt-');
  execFileSync('git', ['init', '-q', '--initial-branch', 'work/x'], { cwd: dir });
  assert.equal(cli(dir, 'init', 'audio-core').status, 0);
  put(dir, 'src/dsp/Filter.cpp', 'float gain = 1.0f;\n');
  return dir;
}
const withLayout = (dir, extra) => { const f = join(dir, '.claude/layout.json'); writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, 'utf8')), ...extra })); };
const says = (dir) => cli(dir, 'doctor').stdout;

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
  put(dir, 'tests/prepare_twice.cpp', `// proves: ${RULE}\nint main() {}\n`);
  const r = says(dir);
  assert.doesNotMatch(r, new RegExp(`answers to:[^\\n]*${RULE}`));
});

test('a mention outside the test folders answers nothing', () => {
  const dir = unit();
  put(dir, 'docs/notes.md', `${RULE} is on my list\n`);
  assert.match(says(dir), new RegExp(`answers to:[^\\n]*${RULE}`));
});

test('ruleTests points a rule at its test, and a pointer to nothing is red', () => {
  const dir = unit();
  withLayout(dir, { ruleTests: { [RULE]: 'gates/prepare.sh' } });
  assert.match(says(dir), new RegExp(`${RULE}: ruleTests names gates/prepare\\.sh, which does not exist`));
  put(dir, 'gates/prepare.sh', 'exit 0\n');
  assert.doesNotMatch(says(dir), new RegExp(`answers to:[^\\n]*${RULE}`));
});

test('a rule may be declined only with a stated reason', () => {
  const dir = unit();
  withLayout(dir, { ruleTests: { [RULE]: 'none: the unit has no prepare, it is a command-line tool' } });
  assert.doesNotMatch(says(dir), new RegExp(`answers to:[^\\n]*${RULE}`));
  withLayout(dir, { ruleTests: { [RULE]: 'none' } });
  assert.match(says(dir), new RegExp(`answers to:[^\\n]*${RULE}`));
});

test('a rule that matches no file yet is not asked for a test: a new project is not red for this', () => {
  const dir = fresh('rt-new-');
  assert.equal(cli(dir, 'init', 'audio-core').status, 0);
  assert.doesNotMatch(says(dir), /answers to/);
});
