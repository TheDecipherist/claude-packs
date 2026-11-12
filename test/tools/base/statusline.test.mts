// 1.8.0: the kit's status line (packs/base/tools/statusline.mts). The user: "the statusline should be part of claude-packs
// because thats how users going forward will see everything thats working and where it is", "the very first field on the top
// line should be the claude-packs version number". Every feed is a scratch file here: no test reads the user's own settings,
// transcript or cache.
import { utimesSync } from 'node:fs';
import { assert, execFileSync, existsSync, fresh, join, mkdirSync, test, writeFileSync } from '../../kit-cli.mts';
import { readJson, toJson } from '../../../packs/base/hooks/lib/json.mts';
import { statusBar } from '../../../packs/base/tools/statusline.mts';
import { machineHost } from '../../../packs/base/hooks/lib/governor.mts';
import { gitState, parseStatusV2 } from '../../../packs/base/tools/statusline-work.mts';
import type { GitAsk } from '../../../packs/base/tools/statusline-work.mts';
import { refreshRuns } from '../../../packs/base/tools/statusline-runs.mts';
import { syncSettings } from '../../../lib/settings.mts';

const NOW = Date.parse('2026-11-10T22:00:00Z');
const RUN = { lead: null, project: '/p/bandwarp', order: 'bandwarp', items: 10, done: 4, percent: 40, finished: false,
  steps: [{ id: 'W3', title: 'The cluster', items: 6, done: 2 }, { id: 'W8', title: 'The panel', items: 4, done: 2 }],
  agents: [{ name: 'dsp', step: 'W3', title: 'The cluster', percent: 50, now: 'COMB width', updated: '2026-11-10T21:55:00Z' },
    { name: 'panel', step: 'W8', title: 'The panel', percent: 25, now: '', updated: '2026-11-10T21:00:00Z' }] };

interface SceneOptions { runs?: readonly unknown[] | null; cacheAge?: number; session?: Record<string, unknown>; transcript?: readonly unknown[] }

function scene({ runs = [RUN], cacheAge = 0, session = {}, transcript = [] }: SceneOptions = {}): { lines: string[]; home: string; cache: string } {
  const home = fresh('statusline-');
  const tools = join(home, 'project', '.claude', 'tools');
  mkdirSync(tools, { recursive: true });
  writeFileSync(join(home, 'project', '.claude', 'claude-packs.lock.json'), toJson({ kit: '9.8.7', files: {} }));
  const cache = join(home, 'cache', 'claude-packs', 'runs.json');
  mkdirSync(join(home, 'cache', 'claude-packs'), { recursive: true });
  if (runs) writeFileSync(cache, toJson({ updated: new Date(NOW - cacheAge).toISOString(), runs }));
  if (runs) utimesSync(cache, (NOW - cacheAge) / 1000, (NOW - cacheAge) / 1000);   // on the test's clock, not the machine's
  const log = join(home, 'session.jsonl');
  writeFileSync(log, transcript.map((t) => toJson(t)).join('\n'));
  const env = { HOME: home, XDG_CACHE_HOME: join(home, 'cache'), CLAUDE_CONFIG_DIR: join(home, 'config'), NO_COLOR: '1' };
  const raw = toJson({ model: { display_name: 'Opus 5.5' }, context_window: { used_percentage: 41 }, transcript_path: log, ...session });
  const lines = statusBar(raw, { env, nowMs: NOW, toolDir: tools, refresh: false, git: () => ({ branch: 'work/x', uncommitted: 2, ahead: 1, behind: 0 }) });
  return { lines, home, cache };
}

test('the top line starts with the kit version from the lock beside the tool, then the model and the context', () => {
  const { lines } = scene({ session: { rate_limits: { five_hour: { used_percentage: 38 } } } });
  assert.equal(lines[0], 'claude-packs 9.8.7 | opus | CTX 41% | 5h 38%');
});

test('the second line has the branch, then the last tool and its target and the last shell command, from the transcript', () => {
  const use = (name: string, input: Record<string, unknown>): unknown => ({ message: { content: [{ type: 'tool_use', name, input }] } });
  const { lines } = scene({ transcript: [use('Bash', { command: 'npm   test' }), use('Read', { file_path: '/a/b.mjs' })] });
  assert.equal(lines[1], '⎇ work/x ✱2 ↑1↓0 | Read /a/b.mjs | $ npm test');
});

test('each run is its project\'s row, with when it was checked, and one row per agent with its bar; a still agent says so', () => {
  const { lines } = scene();
  assert.match(lines[2] ?? '', /^BANDWARP {14} █{8}░{12}  40%  6 of 10 items left, 2 agents, checked 0s ago$/);
  assert.match(lines[3] ?? '', /^├ dsp {8}> W3 The cluster\s+█{5}░{5}  50%  ♡\s+COMB width$/);
  assert.match(lines[4] ?? '', /^└ panel {6}> W8 The panel\s+█{3}░{7}  25%  ♡ 1h00m$/);   // no heartbeat, its file still an hour: red
  assert.equal(lines[3]?.indexOf('█'), lines[4]?.indexOf('█'), 'the agents\' bars in one column');
});

test('the last heartbeat says what each agent did last and how long ago, a long call with what runs in its worktree', () => {
  const at = (sec: number): string => new Date(NOW - sec * 1000).toISOString();
  const [first, second] = RUN.agents;
  const agents = [
    { ...first, updated: at(3600), beat: { t: at(12), event: 'post', tool: 'Edit', what: 'src/Comb.cpp' } },
    { ...second, updated: at(3600), beat: { t: at(1200), event: 'pre', tool: 'Bash', what: 'cmake --build' }, work: { procs: 3, cores: 2.4, memMb: 1229 } },
    { name: 'demo', step: 'W8', title: 'The panel', percent: 0, now: '', updated: null, beat: { t: at(420), event: 'post', tool: 'Grep', what: 'kSlots' } },
    { name: 'gate', step: 'W8', title: 'The panel', percent: 0, now: '', updated: null, beat: { t: at(420), event: 'pre', tool: 'Bash', what: 'ctest' }, work: { procs: 0, cores: 0, memMb: 0 } },
    { name: 'old', step: 'W8', title: 'The panel', percent: 0, now: '', updated: null, beat: null, work: { procs: 2, cores: 0.5, memMb: 300 } },
  ];
  const { lines } = scene({ runs: [{ ...RUN, agents }] });
  assert.match(lines[3] ?? '', /  50%  ♥ 12s\s+WRITE src\/Comb\.cpp  COMB width$/);
  assert.match(lines[4] ?? '', /  25%  ♥ 20m ⚙ 3 proc · 2\.4 cpu · 1\.2G ram ⟳ RUN cmake --build$/);
  assert.match(lines[5] ?? '', /   0%  ♥ 7m\s+READ kSlots$/);
  assert.match(lines[6] ?? '', /   0%  ♥ 7m  ⚙ 0 proc · 0\.0 cpu ·   0M ram ⟳ RUN ctest$/);
  assert.match(lines[7] ?? '', /   0%  ♡     ⚙ 2 proc · 0\.5 cpu · 300M ram$/);
  // every value stands under the same value of the row above: the heartbeat, the processes, the cores, the memory, the action
  for (const mark of ['♥', '⚙', ' cpu', ' ram', 'RUN']) {
    const columns = lines.slice(3, 8).map((l) => l.indexOf(mark)).filter((i) => i >= 0);
    assert.equal(new Set(columns).size, 1, `${mark} at columns ${columns.join(',')}`);
  }
});

test('a run with no agent shows the lead on its current step; a stale cache says how old it is', () => {
  const { lines } = scene({ runs: [{ ...RUN, agents: [] }], cacheAge: 10 * 60_000 });
  // the lead working alone is said on its order's row, never as a row of its own
  assert.match(lines[2] ?? '', /6 of 10 items left, lead on W3 The cluster, checked 10m ago  \(as of 10m ago\)$/);
  assert.equal(lines.length, 3);
});

// KWB-162: the version is the package the project runs (node_modules/@thedecipherist/claude-packs/package.json), not the lock's
// note of what the last install wrote: a packed build installed with --no-save showed the lock's number
test('the kit version is read from the project\'s installed package, the lock only where there is none', () => {
  const { home } = scene();
  const pkg = join(home, 'project', 'node_modules', '@thedecipherist', 'claude-packs');
  mkdirSync(pkg, { recursive: true });
  writeFileSync(join(pkg, 'package.json'), toJson({ name: '@thedecipherist/claude-packs', version: '9.9.0' }));
  const env = { HOME: home, XDG_CACHE_HOME: join(home, 'cache'), CLAUDE_CONFIG_DIR: join(home, 'config'), NO_COLOR: '1' };
  const draw = (toolDir: string, session: Record<string, unknown> = {}): string | undefined =>
    statusBar(toJson(session), { env, nowMs: NOW, toolDir, refresh: false, git: () => ({}) })[0];
  assert.equal(draw(join(home, 'project', '.claude', 'tools')), 'claude-packs 9.9.0', 'the installed package, beside the tool');
  // the kit's own checkout's tool (the global status line), run for a session in the project: the project's package
  const checkout = join(home, 'kit');
  mkdirSync(join(checkout, 'packs', 'base', 'tools'), { recursive: true });
  writeFileSync(join(checkout, 'package.json'), toJson({ name: '@thedecipherist/claude-packs', version: '9.10.0' }));
  assert.equal(draw(join(checkout, 'packs', 'base', 'tools'), { workspace: { project_dir: join(home, 'project') } }), 'claude-packs 9.9.0', 'the session\'s project');
  assert.equal(draw(join(checkout, 'packs', 'base', 'tools')), 'claude-packs 9.10.0', 'no project: the checkout\'s own package.json');
  // KWB-165: a project with only its lock (no package in node_modules), drawn by the checkout's tool: the project's lock, never
  // the checkout's own version (another project showed the kit's 1.9.0 for its own install)
  const locked = join(home, 'locked');
  mkdirSync(join(locked, '.claude'), { recursive: true });
  writeFileSync(join(locked, '.claude', 'claude-packs.lock.json'), toJson({ kit: '1.4.0', files: {} }));
  assert.equal(draw(join(checkout, 'packs', 'base', 'tools'), { workspace: { project_dir: locked } }), 'claude-packs 1.4.0', 'the project\'s own lock');
  // in the kit's own repo, which has a lock of its own install too, the running version is its package.json
  mkdirSync(join(checkout, '.claude'), { recursive: true });
  writeFileSync(join(checkout, '.claude', 'claude-packs.lock.json'), toJson({ kit: '1.0.0', files: {} }));
  assert.equal(draw(join(checkout, 'packs', 'base', 'tools'), { workspace: { project_dir: checkout } }), 'claude-packs 9.10.0', 'the kit itself');
});

test('a broken session, transcript or cache draws what it can and never throws', () => {
  const { home, cache } = scene();
  writeFileSync(cache, '{ half');
  writeFileSync(join(home, 'session.jsonl'), '{"message": {"content": [');
  const env = { HOME: home, XDG_CACHE_HOME: join(home, 'cache'), CLAUDE_CONFIG_DIR: join(home, 'config'), NO_COLOR: '1' };
  const lines = statusBar('not json', { env, nowMs: NOW, toolDir: join(home, 'project', '.claude', 'tools'), refresh: false, git: () => ({}) });
  assert.deepEqual(lines, ['claude-packs 9.8.7']);
});

// KWB-152: the bar runs every second; it asked git three times a render, about 0.3 s on a Mac
test('the bar asks git once for the branch, its changes and how far it is from its upstream, and not again while nothing moved', () => {
  assert.deepEqual(parseStatusV2('# branch.oid abc\n# branch.head work/x\n# branch.upstream origin/work/x\n# branch.ab +2 -1\n1 .M N... 100644 100644 100644 a b src/x.cpp\n? notes.txt\n'),
    { branch: 'work/x', uncommitted: 2, ahead: 2, behind: 1 });
  assert.deepEqual(parseStatusV2('# branch.oid abc\n# branch.head (detached)\n'), { branch: '', uncommitted: 0, ahead: 0, behind: 0 });
  const dir = fresh('statusline-git-');
  execFileSync('git', ['init', '-q', '-b', 'work/x'], { cwd: dir });
  const calls: string[] = [];
  const run: GitAsk = (args) => { calls.push(args.join(' ')); return '# branch.head work/x\n'; };
  const cacheDir = fresh('statusline-git-cache-');
  gitState(dir, { cacheDir, nowMs: 1000, run });
  gitState(dir, { cacheDir, nowMs: 2000, run });
  assert.equal(calls.length, 1, 'the same repo a second later: the cached answer');
  assert.match(calls[0] ?? '', /^status --porcelain=v2 --branch/);
  gitState(dir, { cacheDir, nowMs: 40_000, run });
  assert.equal(calls.length, 2, 'past 30 s: asked again');
  writeFileSync(join(dir, '.git', 'index'), 'x');
  gitState(dir, { cacheDir, nowMs: 41_000, run });
  assert.equal(calls.length, 3, 'its index changed: asked again');
  assert.deepEqual(gitState(fresh('statusline-nogit-'), { cacheDir, run }), {});
});

test('the runs refresh starts only when the cache is old and no refresh is under way', () => {
  const { cache } = scene();
  const started: string[] = [];
  assert.equal(refreshRuns(cache, NOW, (c) => started.push(c)), false);
  assert.equal(refreshRuns(cache, NOW + 60_000, (c) => started.push(c)), true);
  assert.equal(refreshRuns(cache, NOW + 61_000, (c) => started.push(c)), false);
  assert.deepEqual(started, [cache]);
  assert.ok(existsSync(`${cache}.lock`));
});

test('an install wires the kit\'s status line where the project has none, keeps the user\'s own, and takes it out when disabled', () => {
  const claudeDir = join(fresh('statusline-settings-'), '.claude');
  mkdirSync(claudeDir, { recursive: true });
  const line = (): { command?: string; refreshInterval?: number } | undefined =>
    readJson<{ statusLine?: { command?: string; refreshInterval?: number } }>(join(claudeDir, 'settings.json'))?.statusLine;
  assert.equal(syncSettings(claudeDir, ['base'], {}).statusLine, 'set');
  assert.match(line()?.command ?? '', /hooks\/bin\/hook-proxy" status$/);   // W8.6: the Go proxy serves the line
  assert.equal(line()?.refreshInterval, 1);   // W8.6: once a second, so no line seems stuck
  // an old install (the node command, every five seconds) is migrated by the next update; the proxy switched off keeps the node form
  writeFileSync(join(claudeDir, 'settings.json'), toJson({ statusLine: { type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/tools/statusline.mjs"', padding: 0, refreshInterval: 5 } }));
  assert.equal(syncSettings(claudeDir, ['base'], {}).statusLine, 'set');
  assert.deepEqual([line()?.command, line()?.refreshInterval], ['sh "$CLAUDE_PROJECT_DIR/.claude/hooks/bin/hook-proxy" status', 1]);
  assert.equal(syncSettings(claudeDir, ['base'], { disable: ['hooks/bin/hook-proxy'] }).statusLine, 'set');
  assert.match(line()?.command ?? '', /^node .*statusline\.mjs/);
  assert.equal(syncSettings(claudeDir, ['base'], {}).statusLine, 'set');
  assert.equal(syncSettings(claudeDir, ['base'], { disable: ['tools/statusline.mjs'] }).statusLine, 'removed');
  assert.equal(line(), undefined);
  writeFileSync(join(claudeDir, 'settings.json'), toJson({ statusLine: { type: 'command', command: 'my-own-bar' } }));
  assert.equal(syncSettings(claudeDir, ['base'], {}).statusLine, 'kept');
  assert.equal(line()?.command, 'my-own-bar');
});

test('the governor field shows the slots in use of the budget, the jobs queued and paused, and names a job paused past 10 minutes', () => {
  const governor = fresh('statusline-governor-');
  const job = (id: string, slots: number, pausedAt: number | null, command: string): unknown =>
    ({ id, pid: process.pid, pgid: null, kind: 'test', slots, project: '', start: NOW - 3_600_000, pausedAt, command });
  writeFileSync(join(governor, 'jobs.json'), toJson({ v: 1,
    jobs: [job('g1', 3, null, 'npm test'), job('g2', 2, NOW - 12 * 60_000, 'go test -fuzz FuzzWire ./proxy/...')],
    waiting: [{ id: 'w1', pid: process.pid, kind: 'build', want: 4, project: '', since: NOW }] }));
  const host = machineHost({ CLAUDE_PACKS_GOVERNOR_DIR: governor, CLAUDE_PACKS_GOVERNOR_CORES: '18', HOME: governor });
  const env = { HOME: governor, NO_COLOR: '1' };
  const [top] = statusBar('{}', { env, nowMs: NOW, toolDir: governor, refresh: false, git: () => ({}), governor: host });
  assert.match(top ?? '', /(^| \| )GOV 5\/10 1 queued 1 paused paused 12m: go test -fuzz FuzzWire \.\/proxy\/\.\.\.$/);
});

test('the governor field is gone when no job holds or waits for slots', () => {
  const governor = fresh('statusline-governor-idle-');
  const host = machineHost({ CLAUDE_PACKS_GOVERNOR_DIR: governor, CLAUDE_PACKS_GOVERNOR_CORES: '18', HOME: governor });
  const [top] = statusBar('{}', { env: { HOME: governor, NO_COLOR: '1' }, nowMs: NOW, toolDir: governor, refresh: false, git: () => ({}), governor: host });
  assert.doesNotMatch(top ?? '', /GOV/);
});
