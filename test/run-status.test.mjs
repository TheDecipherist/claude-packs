// 1.7.3: `claude-packs status`, where every unattended run stands. The user: "it reports which projects its working on, how many
// agents per project, where they are, and how much is left", "PROJECT NAME (PROGRESS 0% - 100%) > AGENT X > STEP (PROGRESS)".
import { assert, execFileSync, fresh, join, mkdirSync, test, writeFileSync } from './kit-cli.mjs';
import { orderStatus, progressOf, stepsOf } from '../lib/run-status.mjs';
import { runnersIn } from '../lib/run-discovery.mjs';
import { bar, statusCommand, statusLines } from '../lib/status-cli.mjs';

const ORDER = '# Work order: demo\n\n## W0. Set up\n\n1. one\n2. two\n\n**Done when:** x\n\n## W1. The import\n\n1. read\n\n**Done when:** y\n\n## L2. The look\n\n**Done when:** z\n';

function project({ progress = '', status = null } = {}) {
  const dir = fresh('runstatus-');
  const git = (...a) => execFileSync('git', ['-c', 'user.email=t@local', '-c', 'user.name=t', ...a], { cwd: dir, stdio: 'pipe' });
  mkdirSync(join(dir, 'docs/workorders/demo'), { recursive: true });
  writeFileSync(join(dir, 'docs/workorders/demo/workorder.md'), ORDER);
  writeFileSync(join(dir, 'docs/workorders/demo/progress.md'), progress);
  if (status) writeFileSync(join(dir, 'docs/workorders/demo/status.json'), JSON.stringify(status));
  git('init', '-q', '-b', 'main');
  git('add', '.');
  git('commit', '-q', '-m', 'start');
  return { dir, git };
}

test('the steps and their items come from the order: numbered items plus its Done when, any step letter', () => {
  assert.deepEqual(stepsOf(ORDER).map((s) => `${s.id}:${s.items}`), ['W0:3', 'W1:2', 'L2:1']);
  const { seen, done } = progressOf(['- 2026-11-10 W0.1: x', '- W0.2 y', '- W1.1 z', '- 2026-11-10 W1 done: all']);
  assert.deepEqual([...seen.W0], [1, 2]);
  assert.ok(done.has('W1'));
});

test('with no status.json the progress is derived from the progress lines, a finished step counted whole', () => {
  const { dir } = project({ progress: '- W0.1 a\n- W0.2 b\n- W1 done: c\n' });
  const s = orderStatus(dir, 'demo');
  assert.equal(s.source, 'progress lines');
  assert.deepEqual(s.steps.map((x) => `${x.id}:${x.done}/${x.items}`), ['W0:2/3', 'W1:2/2', 'L2:0/1']);
  assert.equal(s.percent, 66.7);
});

test('a run\'s status.json wins, and an agent\'s own file in its worktree gives its step and its progress', () => {
  const status = { steps: [{ id: 'W0', title: 'Set up', items: 4, done: 4 }, { id: 'W1', title: 'The import', items: 4, done: 1, agent: 'reader' }],
    agents: [{ name: 'reader', worktree: '.claude/worktrees/reader', step: 'W1' }] };
  const { dir, git } = project({ status });
  git('worktree', 'add', '-q', '.claude/worktrees/reader', '-b', 'work/reader');
  mkdirSync(join(dir, '.claude/worktrees/reader/docs/workorders/demo/agents'), { recursive: true });
  writeFileSync(join(dir, '.claude/worktrees/reader/docs/workorders/demo/agents/reader.json'), JSON.stringify({ name: 'reader', step: 'W1', items: 4, done: 3, now: 'rejecting bad rows' }));
  const s = orderStatus(dir, 'demo');
  assert.equal(s.source, 'status.json');
  assert.equal(s.percent, 62.5);
  assert.deepEqual(s.agents.map((a) => `${a.name}:${a.step}:${a.percent}:${a.now}`), ['reader:W1:75:rejecting bad rows']);
  const lines = statusLines(s);
  assert.match(lines[0], /^DEMO|^RUNSTATUS/i);
  assert.match(lines[0], /\[█{13}░{7}\]  63%   3 of 8 items left, 1 agent/);
  assert.match(lines[1], /^  > reader     > W1 The import\s+\[█{8}░{2}\]  75%   rejecting bad rows$/);
});

test('a status file that is not JSON is ignored and the progress is derived instead, never a crash', () => {
  const { dir } = project({ progress: '- W0.1 a\n' });
  writeFileSync(join(dir, 'docs/workorders/demo/status.json'), '{ not json');
  assert.equal(orderStatus(dir, 'demo').source, 'progress lines');
});

test('the runs alive are found from their runner processes, never from a Claude session that names the runner', () => {
  const ps = ['  101 bash docs/workorders/bandwarp/run.sh', '  102 claude -p start it with bash docs/workorders/bandwarp/run.sh', '  103 bash docs/workorders/rebuild/run.sh', '  104 vim docs/workorders/x/run.sh'].join('\n');
  assert.deepEqual(runnersIn(ps), [{ pid: 101, order: 'bandwarp' }, { pid: 103, order: 'rebuild' }]);
});

test('--watch prints the report again on every tick, each under its time', async () => {
  const { dir } = project({ progress: '- W0.1 a\n' });
  const out = [];
  const waits = [];
  await statusCommand(['--dir', dir, '--order', 'demo', '--watch', '15'], { log: (l) => out.push(l), wait: async (ms) => waits.push(ms), ticks: 2 });
  assert.equal(out.filter((l) => l.startsWith('-- ')).length, 2);
  assert.deepEqual(waits, [15 * 60_000]);
  assert.equal(bar(50, 10), '[█████░░░░░]');
});
