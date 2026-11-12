// buildq (synth-creator's tool): the machine-wide build queue every heavy job goes through, on the load governor since W8.8 item 2 (its
// own slot folders retired). The governor has its own unit test (test/unit/hooks-lib/governor.test.mts); this one runs the installed
// tool on a governor folder of its own with 4 planted cores (2 slots), an idle planted load and priority 1 (the whole budget may be
// granted to one build), so no test waits on the machine's real
// jobs or load. First test for the command (W5).
import { spawn } from 'node:child_process';
import { assert, fresh, join, readFileSync, spawnSync, test } from '../../kit-cli.mts';
import { plantGovernorJob } from '../../governor-plant.mts';
import { fixture } from '../../fixtures/installs.mts';

const TOOL = join(fixture('synth-creator'), '.claude/tools/buildq.mjs');
const envOf = (governor: string): NodeJS.ProcessEnv =>
  ({ ...process.env, CLAUDE_PACKS_GOVERNOR_DIR: governor, CLAUDE_PACKS_GOVERNOR_CORES: '4', CLAUDE_PACKS_GOVERNOR_LOAD: '0', CLAUDE_PACKS_PRIORITY: '1',
    BUILDQ_PRIORITY: 'normal' });
/** The tool run on its own governor folder, the way a project's build-guard runs it. */
const buildq = (governor: string, args: readonly string[]) => spawnSync('node', [TOOL, ...args], { encoding: 'utf8', env: envOf(governor) });

test('--status says how many of the governor\'s slots are taken, none on a fresh machine', () => {
  const r = buildq(fresh('buildq-'), ['--status']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '0 of 2 slots taken');
});

test('a job runs on a grant, keeps its own exit status, and gives the grant back', () => {
  const governor = fresh('buildq-run-');
  const ok = buildq(governor, ['sh', '-c', 'exit 0']);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(buildq(governor, ['sh', '-c', 'exit 5']).status, 5, 'the status is the command\'s own');
  assert.equal(buildq(governor, ['--status']).stdout.trim(), '0 of 2 slots taken', 'both slots are free again');
});

test('a job is started with the cores it was granted: CLAUDE_PACKS_TEST_CORES and the CMake level', () => {
  const r = buildq(fresh('buildq-env-'), ['sh', '-c', 'echo "$CLAUDE_PACKS_TEST_CORES $CMAKE_BUILD_PARALLEL_LEVEL"']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '2 2', 'alone, a build takes its whole budget of 2');
});

test('a grant held by a live owner counts as taken, and a dead owner\'s grant is taken back', () => {
  const governor = fresh('buildq-slots-');
  plantGovernorJob(governor, process.pid, 1);
  assert.match(buildq(governor, ['--status']).stdout, /1 of 2 slots taken/);
  plantGovernorJob(governor, 999999, 2);
  assert.equal(buildq(governor, ['sh', '-c', 'exit 0']).status, 0, 'the dead owner\'s slots are used, never waited on');
  assert.match(buildq(governor, ['--status']).stdout, /0 of 2 slots taken/, 'the dead owner does not count');
});

test('two builds whose budgets fill the slots run one after the other, never together', async () => {
  const governor = fresh('buildq-two-');
  const log = join(governor, 'log');
  const job = (name: string): Promise<number | null> => new Promise((done) => {
    const child = spawn('node', [TOOL, 'sh', '-c', `echo "${name} start" >> ${log}; sleep 1; echo "${name} end" >> ${log}`], { env: envOf(governor), stdio: 'ignore' });
    child.on('exit', (code) => { done(code); });
  });
  const codes = await Promise.all([job('a'), job('b')]);
  assert.deepEqual(codes, [0, 0]);
  const lines = readFileSync(log, 'utf8').trim().split('\n');
  assert.match(lines[1] ?? '', /end$/, `the first ends before the second starts: ${lines.join(', ')}`);
});

test('no command says how to use it and exits 2', () => {
  const r = buildq(fresh('buildq-usage-'), []);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: node \.claude\/tools\/buildq\.mjs/);
});
