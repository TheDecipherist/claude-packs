// KWB-111: the build queue limited how many jobs ran, never how big: two "allowed" jobs at -j18 and a fanned-out test run filled 18 cores
// (load 22), the kit's own gate timed out, and the user's apps slowed. Every build and test run the queue or quiet-test starts now takes
// its share of one machine-wide core budget, and runs at a low priority. No hook of its own: lib/core-budget, quiet-test and buildq.
import { join } from 'node:path';
import { budgetEnv, capJobs, coreBudget, gentle, shareOf } from '../../../packs/base/hooks/lib/core-budget.mts';
import { plan } from '../../../packs/base/tools/quiet-test.mts';
import { scratchDir } from '../../../packs/base/hooks/lib/files.mts';
import { withLayout } from '../../fixtures/installs.mts';
import { assert, spawnSync, test } from '../../kit-cli.mts';
import { fixture } from '../hook-rig.mts';

test('the budget comes from the environment, then the layout, then a third of the cores, never under 2', () => {
  assert.equal(coreBudget({ BUILDQ_CORES: '5' }, { guards: { buildq: { cores: 9 } } }, 18), 5);
  assert.equal(coreBudget({}, { guards: { buildq: { cores: 9 } } }, 18), 9);
  assert.equal(coreBudget({}, {}, 18), 6);
  assert.equal(coreBudget({}, {}, 4), 2);
});

test('a job count a command asks for is cut to its share, and a build that asks for none gets its share', () => {
  assert.deepEqual(capJobs(['cmake', '--build', 'out', '-j', '18'], 3), ['cmake', '--build', 'out', '-j', '3']);
  assert.deepEqual(capJobs(['ninja', '-j18', 'x'], 3), ['ninja', '-j3', 'x']);
  assert.deepEqual(capJobs(['python3', 't.py', '--jobs', '8'], 3), ['python3', 't.py', '--jobs', '3']);
  assert.deepEqual(capJobs(['python3', 't.py', '--jobs=8'], 3), ['python3', 't.py', '--jobs=3']);
  assert.deepEqual(capJobs(['ctest', '--parallel', '12'], 3), ['ctest', '--parallel', '3']);
  assert.deepEqual(capJobs(['cmake', '--build', 'out', '-j', '2'], 3), ['cmake', '--build', 'out', '-j', '2'], 'a smaller ask stands');
  assert.deepEqual(capJobs(['ninja', '-C', 'out'], 3), ['ninja', '-j3', '-C', 'out'], 'ninja with no -j would take every core');
  assert.deepEqual(capJobs(['ls', '-la'], 3), ['ls', '-la']);
});

test('the environment carries the share to the tools that read it', () => {
  const env = budgetEnv({ PATH: '/bin' }, 3);
  assert.equal(env['CMAKE_BUILD_PARALLEL_LEVEL'], '3');
  assert.equal(env['CTEST_PARALLEL_LEVEL'], '3');
  assert.equal(env['MAKEFLAGS'], '-j3');
  assert.equal(env['PATH'], '/bin');
});

// KWB-149: background QoS (taskpolicy -b) kept a Mac's builds on its efficiency cores, about 2.5 of 18 (the user: "I can
// literally hear the mac when it really works ... Nothing is happening"); a build yields with nice, on every core
test('a job runs at a low priority unless the user asks for normal, on every core: never throttled to slow cores', () => {
  assert.deepEqual(gentle(['ninja'], { platform: 'darwin', env: {} }), ['nice', '-n', '10', 'ninja']);
  assert.deepEqual(gentle(['ninja'], { platform: 'linux', env: {} }), ['nice', '-n', '10', 'ninja']);
  assert.deepEqual(gentle(['ninja'], { platform: 'darwin', env: { BUILDQ_PRIORITY: 'normal' } }), ['ninja']);
  assert.deepEqual(gentle(['ctest'], { platform: 'darwin', env: {} }), ['nice', '-n', '10', 'ctest']);
});

// KWB-150: a build alone took budget / slots, 3 of a 14-core budget on an idle Mac, for 12 minutes
test('a job takes the budget divided by the jobs running as it starts, its own counted: alone, all of it; never less than its slot\'s share', () => {
  assert.equal(shareOf(16, 2, 1), 16);
  assert.equal(shareOf(16, 2, 2), 8);
  assert.equal(shareOf(14, 4, 1), 14);
  assert.equal(shareOf(14, 4, 3), 4);
  assert.equal(shareOf(14, 4, 9), 3);    // more jobs than slots (one being taken back): never under budget / slots
  assert.equal(shareOf(6, 2), 3);        // no count given: the slot's share, as before
});

test('a test run through quiet-test takes the same share: its --jobs is cut and CTest is told', () => {
  const run = plan(['python3', 'tools/changed_tests.py', '--jobs', '9'], { PATH: process.env['PATH'], BUILDQ_CORES: '6' }, 'linux');
  const command = (run.command ?? []).join(' ');
  assert.ok(command.endsWith('tools/changed_tests.py --jobs 3'), command);
  assert.equal(run.env?.['CTEST_PARALLEL_LEVEL'], '3');
});

test('the queue runs a command with its share: a -j asked for is cut, and the share reaches the environment', () => {
  const dir = fixture('audio-core');
  withLayout(dir, (layout) => ({ guards: { ...(layout['guards'] as Record<string, unknown>), buildq: { cores: 4 } } }));
  const probe = 'console.log(process.argv.slice(1).join(" ") + "|" + process.env.CMAKE_BUILD_PARALLEL_LEVEL)';
  // The layout's cores are what is tested: a BUILDQ_CORES of whoever runs the suite would win over them
  const { BUILDQ_CORES: _caller, ...outer } = process.env;
  const r = spawnSync('node', [join(dir, '.claude/tools/buildq.mjs'), 'node', '-e', probe, '--', '-j', '18'], {
    cwd: dir, encoding: 'utf8', env: { ...outer, BUILDQ_DIR: scratchDir('buildq-slots-'), BUILDQ_SLOTS: '2', BUILDQ_PRIORITY: 'normal' },
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /-j 4\|4/, 'a job alone takes the whole budget of four cores (KWB-150), not the slot\'s two');
});
