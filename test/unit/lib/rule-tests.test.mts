// lib/rule-tests.mts (KF-31): a rule whose Check names a test that nothing in the project answers to.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { namesATest, ruleTestProblems } from '../../../lib/rule-tests.mts';

const NAMED = '## Check\nTest: render it twice.\n';

function project(rule: string, files: Record<string, string> = {}): string {
  const dir = scratchDir('rule-tests-');
  put(join(dir, '.claude/rules', `${rule}.md`), NAMED);
  for (const [rel, text] of Object.entries(files)) put(join(dir, rel), text);
  return dir;
}

test('a Check line "Test:" names a test; prose about a hook does not', () => {
  assert.equal(namesATest('## Check\n- Unit test: constant input.\n'), true);
  assert.equal(namesATest('## Check\nThe realtime-guard hook flags it.\n'), false);
  assert.equal(namesATest('# T\n\nTest: outside a Check section.\n'), false);
});

test('a live rule that names a test nothing answers to is a problem; a test that names the rule answers it', () => {
  const bare = project('prepare', { 'tests/a.test.mjs': 'nothing\n' });
  const problems = ruleTestProblems(bare, { folders: {}, concepts: {} }, { liveRules: ['prepare.md'], files: ['tests/a.test.mjs'] });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /1 rule\(s\) name a test nothing in this project answers to: prepare/);
  const answered = project('prepare', { 'tests/a.test.mjs': '// proves: prepare\n' });
  assert.deepEqual(ruleTestProblems(answered, { folders: {}, concepts: {} }, { liveRules: ['prepare.md'], files: ['tests/a.test.mjs'] }), []);
});

test('ruleTests: a path that exists answers, one that is gone is its own problem, "none: reason" declines', () => {
  const dir = project('prepare', { 'check.sh': 'x' });
  const input = { liveRules: ['prepare.md'], files: [] };
  assert.deepEqual(ruleTestProblems(dir, { folders: {}, concepts: {}, ruleTests: { prepare: 'check.sh' } }, input), []);
  assert.deepEqual(ruleTestProblems(dir, { folders: {}, concepts: {}, ruleTests: { prepare: 'none: manual' } }, input), []);
  assert.deepEqual(ruleTestProblems(dir, { folders: {}, concepts: {}, ruleTests: { prepare: 'gone.sh' } }, input), ['prepare: ruleTests names gone.sh, which does not exist']);
});

test('a rule that is not live is not judged, and a project with no rules folder has no problems', () => {
  const dir = project('prepare');
  assert.deepEqual(ruleTestProblems(dir, { folders: {}, concepts: {} }, { liveRules: [], files: [] }), []);
  assert.deepEqual(ruleTestProblems(scratchDir('rule-tests-'), { folders: {}, concepts: {} }, { liveRules: ['prepare.md'], files: [] }), []);
});
