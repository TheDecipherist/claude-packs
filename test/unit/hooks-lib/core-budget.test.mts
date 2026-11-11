// core-budget.mts: one machine-wide core budget (KWB-111): the budget, a job's share, a command's job counts cut to it.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { put, scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { budgetEnv, capJobs, coreBudget, gentle, projectLayout, shareOf } from '../../../packs/base/hooks/lib/core-budget.mts';

test('the budget is BUILDQ_CORES, else the layout\'s, else a third of the machine and never under 2', () => {
  assert.equal(coreBudget({ BUILDQ_CORES: '6' }, {}, 18), 6);
  assert.equal(coreBudget({}, { guards: { buildq: { cores: 4 } } }, 18), 4);
  assert.equal(coreBudget({ BUILDQ_CORES: '6' }, { guards: { buildq: { cores: 4 } } }, 18), 6);
  assert.equal(coreBudget({}, {}, 18), 6);
  assert.equal(coreBudget({}, {}, 2), 2);
  assert.equal(coreBudget({ BUILDQ_CORES: '3.9' }, {}, 18), 3);
});

test('a budget that is not a number, or under one, is ignored: planted wrong input', () => {
  assert.equal(coreBudget({ BUILDQ_CORES: 'many' }, {}, 18), 6);
  assert.equal(coreBudget({ BUILDQ_CORES: '0' }, {}, 18), 6);
  assert.equal(coreBudget({}, { guards: { buildq: { cores: 'x' } } }, 9), 3);
});

test('a job\'s share is the budget over the jobs running, at least one, and a lone job takes it all', () => {
  assert.equal(shareOf(8, 2), 4);
  assert.equal(shareOf(8, 2, 1), 8);
  assert.equal(shareOf(8, 2, 5), 4, 'more jobs than slots cannot starve it');
  assert.equal(shareOf(1, 4), 1);
  assert.equal(shareOf(8, 0), 8);
});

test('every job count in a command is cut to the share; ninja with none gets one', () => {
  assert.deepEqual(capJobs(['make', '-j18'], 4), ['make', '-j4']);
  assert.deepEqual(capJobs(['make', '-j', '18', 'all'], 4), ['make', '-j', '4', 'all']);
  assert.deepEqual(capJobs(['ctest', '--parallel=9'], 4), ['ctest', '--parallel=4']);
  assert.deepEqual(capJobs(['cmake', '--build', '.', '--parallel', '12'], 4), ['cmake', '--build', '.', '--parallel', '4']);
  assert.deepEqual(capJobs(['make', '-j2'], 4), ['make', '-j2'], 'a smaller ask stays');
  assert.deepEqual(capJobs(['ninja'], 4), ['ninja', '-j4']);
  assert.deepEqual(capJobs(['/usr/bin/ninja', '-l', '9'], 4), ['/usr/bin/ninja', '-j4', '-l', '4']);
  assert.deepEqual(capJobs(['make'], 4), ['make']);
});

test('the share is named where CMake, CTest and make read it, and the job runs under nice unless asked normal', () => {
  assert.deepEqual(budgetEnv({ A: '1' }, 3), { A: '1', CMAKE_BUILD_PARALLEL_LEVEL: '3', CTEST_PARALLEL_LEVEL: '3', MAKEFLAGS: '-j3' });
  assert.deepEqual(gentle(['make'], { platform: 'darwin', env: {} }), ['nice', '-n', '10', 'make']);
  assert.deepEqual(gentle(['make'], { platform: 'win32', env: {} }), ['make']);
  assert.deepEqual(gentle(['make'], { platform: 'linux', env: { BUILDQ_PRIORITY: 'normal' } }), ['make']);
});

test('the layout is read from the project, and a missing or non-object one is empty', () => {
  const dir = scratchDir('budget-');
  assert.deepEqual(projectLayout(dir), {});
  put(join(dir, '.claude/layout.json'), '[1]');
  assert.deepEqual(projectLayout(dir), {});
  put(join(dir, '.claude/layout.json'), '{"guards":{"buildq":{"cores":5}}}');
  assert.equal(coreBudget({}, projectLayout(dir), 18), 5);
});
