// 1.7.3: `claude-packs status`, where every unattended run stands. The user: "it reports which projects its working on, how many
// agents per project, where they are, and how much is left", "PROJECT NAME (PROGRESS 0% - 100%) > AGENT X > STEP (PROGRESS)".
import { utimesSync } from 'node:fs';
import { assert, execFileSync, fresh, git as gitIn, join, mkdirSync, test, writeFileSync } from '../kit-cli.mts';
import { orderStatus, progressOf, runRows, runnersIn, runsReport, stepsOf, workIn } from '../../lib/run-status.mts';
import type { AgentStatus, OrderStatus } from '../../lib/run-status.mts';
import { bar, statusCommand, statusLines } from '../../lib/status-cli.mts';
import { toJson } from '../../packs/base/hooks/lib/json.mts';

const HERE = { env: process.env, platform: process.platform };
const ORDER = '# Work order: demo\n\n## W0. Set up\n\n1. one\n2. two\n\n**Done when:** x\n\n## W1. The import\n\n1. read\n\n**Done when:** y\n\n## L2. The look\n\n**Done when:** z\n';

interface Project { dir: string; git: (...args: string[]) => string }
function project({ progress = '', status = null }: { progress?: string; status?: unknown } = {}): Project {
  const dir = fresh('runstatus-');
  const git = (...a: string[]): string => gitIn(dir, ...a);
  mkdirSync(join(dir, 'docs/workorders/demo'), { recursive: true });
  writeFileSync(join(dir, 'docs/workorders/demo/workorder.md'), ORDER);
  writeFileSync(join(dir, 'docs/workorders/demo/progress.md'), progress);
  if (status) writeFileSync(join(dir, 'docs/workorders/demo/status.json'), toJson(status));
  git('init', '-q', '-b', 'main');
  git('add', '.');
  git('commit', '-q', '-m', 'start');
  return { dir, git };
}

/** An agent row as the status report builds it: the fields a test does not name are the plain ones. */
const agentOf = (fields: Partial<AgentStatus> & Pick<AgentStatus, 'name'>): AgentStatus =>
  ({ step: null, title: '', now: '', state: null, updated: null, percent: null, beat: null, path: '', stale: false, fresh: false, ...fields });
/** An order's status holding these agents, and the one step W1. */
const orderWith = (agents: AgentStatus[]): OrderStatus => ({
  project: '/p/demo', order: 'demo', items: 2, done: 0, percent: 0, finished: false, lead: null, source: 'status.json',
  steps: [{ id: 'W1', title: 'x', items: 2, done: 0, agent: null }], agents,
});
const at = (now: number, min: number): string => new Date(now - min * 60_000).toISOString();

test('the steps and their items come from the order: numbered items plus its Done when, any step letter', () => {
  assert.deepEqual(stepsOf(ORDER).map((s) => `${s.id}:${s.items}`), ['W0:3', 'W1:2', 'L2:1']);
  const { seen, done } = progressOf(['- 2026-11-10 W0.1: x', '- W0.2 y', '- W1.1 z', '- 2026-11-10 W1 done: all']);
  assert.deepEqual([...(seen.W0 ?? [])], [1, 2]);
  assert.ok(done.has('W1'));
});

test('with no status.json the progress is derived from the progress lines, a finished step counted whole', () => {
  const { dir } = project({ progress: '- W0.1 a\n- W0.2 b\n- W1 done: c\n' });
  const s = orderStatus(dir, 'demo', HERE);
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
  writeFileSync(join(dir, '.claude/worktrees/reader/docs/workorders/demo/agents/reader.json'), toJson({ name: 'reader', step: 'W1', items: 4, done: 3, now: 'rejecting bad rows' }));
  const s = orderStatus(dir, 'demo', HERE);
  assert.equal(s.source, 'status.json');
  assert.equal(s.percent, 87.5);   // the run's file says 1 of W1's 4; its agent's own file says 3: the agent's count moves the total
  assert.deepEqual(s.agents.map((a) => `${a.name}:${a.step}:${a.percent}:${a.now}`), ['reader:W1:75:rejecting bad rows']);
  const lines = statusLines(s);
  assert.match(lines[0] ?? '', /^DEMO|^RUNSTATUS/i);
  assert.match(lines[0] ?? '', /\[█{18}░{2}\]  88%   1 of 8 items left, 1 agent/);
  assert.match(lines[1] ?? '', /^└ reader     > W1 The import\s+\[█{8}░{2}\]  75%\s+♡\s+rejecting bad rows$/);   // an agent hangs from its order
});

// KWB-164: a paused agent is not a stuck one: red means something is wrong
test('an agent its own file calls paused, waiting or finished is never QUIET, and says so; a still agent that is not paused still is', () => {
  const now = Date.parse('2026-11-10T22:00:00Z');
  const beat = { t: at(now, 40), event: 'post', tool: 'Bash', what: 'git push' };
  const s = orderWith([
    agentOf({ name: 'a', step: 'W1', updated: at(now, 40), beat, now: 'paused for the kit update' }),
    agentOf({ name: 'b', step: 'W1', updated: at(now, 40), beat, now: 'waiting', state: 'paused' }),
    agentOf({ name: 'c', step: 'W1', updated: at(now, 40), beat, now: 'finished: item 5 open, waiting' }),
    agentOf({ name: 'd', step: 'W1', updated: at(now, 40), beat, now: 'building the gates' })]);
  const { agents } = runRows(s, now);
  assert.deepEqual(agents.map((a) => a.quiet), [0, 0, 0, 40]);
  assert.deepEqual(agents.map((a) => Boolean(a.paused)), [true, true, true, false]);
  // KWB-167: a stopped agent's row is cleared of its last action and its process counts; a working one keeps them
  assert.doesNotMatch(agents[0]?.live ?? '', /RUN|⚙|⟳/, agents[0]?.live);
  assert.match(agents[3]?.live ?? '', /RUN git push/, agents[3]?.live);
});

test('an agent is QUIET after 5 minutes with no call, or a call running with nothing working in its worktree; a busy call never', () => {
  const now = Date.parse('2026-11-10T22:00:00Z');
  const beat = (min: number, event: string): AgentStatus['beat'] => ({ t: at(now, min), event, tool: event === 'pre' ? 'Bash' : 'Read', what: 'x' });
  const s = orderWith([
    agentOf({ name: 'a', step: 'W1', updated: at(now, 60), beat: beat(4, 'post') }),
    agentOf({ name: 'b', step: 'W1', updated: at(now, 60), beat: beat(6, 'post') }),
    agentOf({ name: 'c', step: 'W1', updated: at(now, 60), beat: beat(45, 'pre'), work: { procs: 3, cores: 2, memMb: 850, queued: false } }),
    agentOf({ name: 'd', step: 'W1', updated: at(now, 60), beat: beat(6, 'pre'), work: { procs: 0, cores: 0, memMb: 0, queued: false } }),
    agentOf({ name: 'e', step: 'W1', updated: at(now, 60), beat: beat(20, 'pre'), work: null }),
    agentOf({ name: 'f', step: 'W1', updated: at(now, 60), beat: beat(31, 'pre'), work: null }),
    agentOf({ name: 'g', step: 'W1', updated: at(now, 60), beat: beat(40, 'pre'), work: { procs: 2, cores: 0, memMb: 60, queued: true } })]);
  const { agents } = runRows(s, now);
  assert.deepEqual(agents.map((a) => a.quiet), [0, 6, 0, 6, 0, 31, 0]);
  assert.equal(agents[2]?.live, '♥ 45m ⚙ 3 proc · 2.0 cpu · 850M ram        ⟳ RUN x');
  assert.equal(agents[6]?.live, '♥ 40m ⚙ 2 proc · 0.0 cpu ·  60M ram queued ⟳ RUN x');
  const plain = statusLines(s, now);
  assert.match(plain[2] ?? '', / ! ♥ 6m\s+READ x$/);
});

test('the check counts each process for the deepest folder it works in, its cores and memory summed, a build waiting its slot', () => {
  const all = [{ pid: 1, cpu: 150, rssKb: 512 * 1024, cwd: '/p/.claude/worktrees/dsp/build', queued: false }, { pid: 2, cpu: 50, rssKb: 256 * 1024, cwd: '/p/.claude/worktrees/dsp', queued: false },
    { pid: 3, cpu: 90, rssKb: 1024, cwd: '/p', queued: false }, { pid: 4, cpu: 10, rssKb: 1024, cwd: '/elsewhere', queued: false },
    { pid: 5, cpu: 0, rssKb: 1024, cwd: '/p/.claude/worktrees/panel', queued: true }];
  assert.deepEqual(workIn(['/p', '/p/.claude/worktrees/dsp', '/p/.claude/worktrees/panel'], all), {
    '/p': { procs: 1, cores: 0.9, memMb: 1, queued: false }, '/p/.claude/worktrees/dsp': { procs: 2, cores: 2, memMb: 768, queued: false },
    '/p/.claude/worktrees/panel': { procs: 1, cores: 0, memMb: 1, queued: true } });
  assert.equal(workIn(['/p'], []), null);
});

test('an agent shows from its first minute, by its worktree on the order\'s branch; a merged one untouched for two hours does not, unless work runs in it', () => {
  const { dir, git } = project({ status: { steps: [{ id: 'W1', title: 'x', items: 2, done: 0 }], agents: [] } });
  git('branch', 'work/demo');
  git('worktree', 'add', '-q', '.claude/worktrees/fresh', '-b', 'work/demo-fresh');   // just started: no file, no commit
  git('worktree', 'add', '-q', '.claude/worktrees/old', '-b', 'work/demo-old');       // finished long ago, merged
  git('worktree', 'add', '-q', '.claude/worktrees/other', '-b', 'work/someone-else'); // another order's or a person's
  const gitdir = join(dir, '.git', 'worktrees', 'old');
  const hoursAgo = (Date.now() - 3 * 3600_000) / 1000;
  for (const f of ['HEAD', 'index', 'logs/HEAD']) { try { utimesSync(join(gitdir, f), hoursAgo, hoursAgo); } catch { /* not every file is there */ } }
  assert.deepEqual(orderStatus(dir, 'demo', HERE).agents.map((a) => a.name).sort(), ['fresh', 'old']);
  const report = runsReport({ ...HERE, dir, order: 'demo' });
  const [run] = report.runs;
  assert.ok(run);
  assert.deepEqual(run.agents.map((a) => a.name), ['fresh'], 'the finished agent left out');
  assert.ok(Date.now() - Date.parse(run.agents[0]?.updated ?? '') < 60_000, 'its clock: git\'s last touch of its worktree');
  // a worktree made for an agent, its branch with no commit of its own and nothing running: waiting for its agent
  const [waiting] = runRows(run, Date.now()).agents;
  assert.equal(waiting?.title, 'not started yet');
  writeFileSync(join(dir, '.claude/worktrees/fresh/notes.txt'), 'x');
  execFileSync('git', ['-C', join(dir, '.claude/worktrees/fresh'), '-c', 'user.email=t@local', '-c', 'user.name=t', 'commit', '-q', '-m', 'one', '--allow-empty']);
  const again = runsReport({ ...HERE, dir, order: 'demo' }).runs[0];
  assert.ok(again);
  assert.equal(runRows(again, Date.now()).agents[0]?.title, 'no status file yet', 'its first commit: started');
});

test('a status file that is not JSON is ignored and the progress is derived instead, never a crash', () => {
  const { dir } = project({ progress: '- W0.1 a\n' });
  writeFileSync(join(dir, 'docs/workorders/demo/status.json'), '{ not json');
  assert.equal(orderStatus(dir, 'demo', HERE).source, 'progress lines');
});

test('the runs alive are found from their runner processes, never from a Claude session that names the runner', () => {
  const ps = ['  101 bash docs/workorders/bandwarp/run.sh', '  102 claude -p start it with bash docs/workorders/bandwarp/run.sh', '  103 bash docs/workorders/rebuild/run.sh', '  104 vim docs/workorders/x/run.sh'].join('\n');
  assert.deepEqual(runnersIn(ps), [{ pid: 101, order: 'bandwarp' }, { pid: 103, order: 'rebuild' }]);
});

test('--watch prints the report again on every tick, each under its time', async () => {
  const { dir } = project({ progress: '- W0.1 a\n' });
  const out: string[] = [];
  const waits: number[] = [];
  await statusCommand(['--dir', dir, '--order', 'demo', '--watch', '15'], { log: (l) => out.push(l), wait: async (ms) => { waits.push(ms); }, ticks: 2 });
  assert.equal(out.filter((l) => l.startsWith('-- ')).length, 2);
  assert.deepEqual(waits, [15 * 60_000]);
  assert.equal(bar(50, 10), '[█████░░░░░]');
});
