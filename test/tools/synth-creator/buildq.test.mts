// buildq (synth-creator's tool): the machine-wide build queue every heavy job goes through. The slot library has its own unit
// test (test/unit/lib/build-queue.test.mts); this one runs the installed tool on a queue folder of its own, so no test
// waits on the machine's real slots. First test for the command (W5).
import { assert, fresh, join, mkdirSync, spawnSync, test, writeFileSync } from '../../kit-cli.mts';
import { fixture } from '../../fixtures/installs.mts';

const TOOL = join(fixture('synth-creator'), '.claude/tools/buildq.mjs');
/** The tool run with its own queue folder (BUILDQ_DIR) and two slots, the way a project's build-guard runs it. */
const buildq = (queue: string, args: readonly string[]) =>
  spawnSync('node', [TOOL, ...args], { encoding: 'utf8', env: { ...process.env, BUILDQ_DIR: queue, BUILDQ_SLOTS: '2', BUILDQ_PRIORITY: 'normal' } });

test('--status says how many slots are taken, none on a fresh queue', () => {
  const r = buildq(fresh('buildq-'), ['--status']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '0 of 2 slots taken');
});

test('a job runs in a slot, keeps its own exit status, and gives the slot back', () => {
  const queue = fresh('buildq-run-');
  const ok = buildq(queue, ['sh', '-c', 'exit 0']);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(buildq(queue, ['sh', '-c', 'exit 5']).status, 5, 'the status is the command\'s own');
  assert.equal(buildq(queue, ['--status']).stdout.trim(), '0 of 2 slots taken', 'both slots are free again');
});

test('a slot held by a live owner counts as taken, and a dead owner\'s slot is taken back', () => {
  const queue = fresh('buildq-slots-');
  const live = join(queue, 'slot-0');
  mkdirSync(live, { recursive: true });
  writeFileSync(join(live, 'pid'), `${process.pid}\n`);
  assert.match(buildq(queue, ['--status']).stdout, /1 of 2 slots taken/);
  const dead = join(queue, 'slot-1');
  mkdirSync(dead);
  writeFileSync(join(dead, 'pid'), '999999\n');
  assert.equal(buildq(queue, ['sh', '-c', 'exit 0']).status, 0, 'the free slot is used, never waited on');
  assert.match(buildq(queue, ['--status']).stdout, /1 of 2 slots taken/, 'the dead owner does not count');
});

test('no command says how to use it and exits 2', () => {
  const r = buildq(fresh('buildq-usage-'), []);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: node \.claude\/tools\/buildq\.mjs/);
});
