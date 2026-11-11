// KF-31: a new project and a new law are not red for a rule's test (split from rule-tests.test.mts so no file sums over a minute).
import { assert, cli, join, readFileSync, test, writeFileSync } from '../kit-cli.mts';
import { fixture } from '../fixtures/installs.mts';
import { says, unit } from './rule-tests-rig.mts';

test('a rule that matches no file yet is not asked for a test: a new project is not red for this', () => {
  const dir = fixture('audio-core');
  assert.doesNotMatch(says(dir), /answers to/);
});

test('a new law never turns an installed project red: without the ruleTests key it is a note, and adding the key is the choice', () => {
  const dir = unit();
  const file = join(dir, '.claude/layout.json');
  const layout = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  assert.deepEqual(layout.ruleTests, {}, 'a first install has chosen it');
  const { ruleTests: _chosen, ...installedBefore } = layout;
  writeFileSync(file, JSON.stringify(installedBefore));
  const before = cli(dir, 'doctor');
  assert.match(before.stdout, /note: .*rule\(s\) name a test nothing/);
  assert.doesNotMatch(before.stdout, /PROBLEM: .*rule\(s\) name a test nothing/);
  assert.match(before.stdout, /"ruleTests": \{\}/, 'the note says how to choose it');
  writeFileSync(file, JSON.stringify({ ...installedBefore, ruleTests: {} }));
  assert.match(cli(dir, 'doctor').stdout, /PROBLEM: .*rule\(s\) name a test nothing/);
});
